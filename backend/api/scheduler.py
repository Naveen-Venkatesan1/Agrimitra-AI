import logging
import threading
from datetime import datetime
import pytz
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger

from backend.api.notifications.firebase_service import get_firestore_client, send_push_notification

logger = logging.getLogger("agrimitra.scheduler")
KOLKATA_TZ = pytz.timezone("Asia/Kolkata")

_scheduler: BackgroundScheduler = None
_sent_notifications_cache = set()


def scheduled_market_sync_job():
    """Scheduled cron execution at 06:00 IST for Market Intelligence prices."""
    try:
        logger.info("Executing scheduled Market Prices sync...")
        from backend.api.market.service import sync_market_prices
        sync_market_prices()
        logger.info("Scheduled Market Prices sync completed successfully.")
    except Exception as e:
        logger.error(f"Scheduled Market Prices sync encountered an error: {e}")


def check_and_trigger_irrigation_notifications():
    """
    Checks active irrigation schedules from Firestore for the current minute,
    and sends localized push notifications through Firebase Cloud Messaging.
    """
    global _sent_notifications_cache
    logger.info("Executing scheduled Smart Irrigation minute check...")
    
    db = get_firestore_client()
    if not db:
        logger.warning("Firestore client unavailable. Skipping irrigation check.")
        return

    try:
        # Get current time and date in Asia/Kolkata
        now = datetime.now(KOLKATA_TZ)
        time_str = now.strftime("%H:%M") # Format: "06:00"
        date_str = now.strftime("%Y-%m-%d")
        
        # Clean cache from previous dates
        _sent_notifications_cache = {item for item in _sent_notifications_cache if item[2] == date_str}

        users_ref = db.collection('users')
        docs = users_ref.get()

        for doc in docs:
            user_data = doc.to_dict()
            uid = doc.id
            fcm_token = user_data.get('fcmToken')
            
            if not fcm_token:
                continue

            schedule = user_data.get('irrigationSchedule')
            if not schedule or not isinstance(schedule, dict):
                continue
            
            if not schedule.get('enabled', False):
                continue

            times = schedule.get('times', [])
            if not isinstance(times, list):
                continue

            # Format user times to HH:MM format for matching
            formatted_times = []
            for t in times:
                try:
                    t_str = str(t).strip()
                    if ":" in t_str:
                        parts = t_str.split(":")
                        h = int(parts[0])
                        m_str = parts[1][:2]
                        m = int(m_str)
                        if "pm" in t_str.lower() and h < 12:
                            h += 12
                        elif "am" in t_str.lower() and h == 12:
                            h = 0
                        formatted_times.append(f"{h:02d}:{m:02d}")
                    else:
                        formatted_times.append(t_str)
                except Exception as parse_err:
                    logger.warning(f"Error parsing user irrigation time '{t}' for user {uid}: {parse_err}")

            if time_str in formatted_times:
                # Check for duplicate
                cache_key = (uid, time_str, date_str)
                if cache_key in _sent_notifications_cache:
                    logger.info(f"Duplicate notification blocked for user {uid} at {time_str}")
                    continue

                # Get localized notification message
                lang = user_data.get('languageCode') or user_data.get('language') or 'en'
                lang_str = str(lang).lower().strip()

                if "ta" in lang_str: # Tamil
                    title = "நீர்ப்பாசன நினைவூட்டல்"
                    body = "தண்ணீர் விடும் நேரம் வந்துவிட்டது. உங்கள் வயலுக்கு தண்ணீர் விடுங்கள்."
                else: # English / Default
                    title = "Smart Irrigation Reminder"
                    body = "It's time to water your field."

                logger.info(f"Triggering FCM notification for user {uid} at {time_str} in language: {lang_str}")
                success = send_push_notification(
                    token=fcm_token,
                    title=title,
                    body=body,
                    data={
                        "click_action": "FLUTTER_NOTIFICATION_CLICK",
                        "category": "irrigation",
                        "uid": uid,
                        "time": time_str
                    }
                )

                if success:
                    _sent_notifications_cache.add(cache_key)

    except Exception as e:
        logger.error(f"Error running check_and_trigger_irrigation_notifications: {e}")


def start_scheduler():
    """
    Initializes and starts the APScheduler BackgroundScheduler.
    Schedules minutely irrigation checks and daily 06:00 AM IST market price sync.
    """
    global _scheduler
    if _scheduler is not None and _scheduler.running:
        logger.warning("Background scheduler is already running.")
        return _scheduler

    try:
        _scheduler = BackgroundScheduler(timezone=KOLKATA_TZ)
        
        # Daily Market Prices Sync at 06:00 IST
        market_trigger = CronTrigger(
            hour=6,
            minute=0,
            timezone=KOLKATA_TZ
        )
        
        _scheduler.add_job(
            scheduled_market_sync_job,
            trigger=market_trigger,
            id="market_prices_sync_job",
            name="Market Prices Daily Sync",
            replace_existing=True
        )

        # Minutely irrigation schedule job
        irrigation_trigger = CronTrigger(
            minute="*",
            second=0,
            timezone=KOLKATA_TZ
        )
        
        _scheduler.add_job(
            check_and_trigger_irrigation_notifications,
            trigger=irrigation_trigger,
            id="irrigation_notifications_job",
            name="Smart Irrigation Notification Trigger",
            replace_existing=True
        )
        
        _scheduler.start()
        logger.info("AgriMitra BackgroundScheduler started successfully with CronTrigger(06:00 IST Asia/Kolkata) and minutely irrigation triggers.")

        # Perform Market Intelligence empty database check
        try:
            from backend.api.market.database import get_db_connection
            from backend.api.market.service import sync_market_prices
            with get_db_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT COUNT(*) as count FROM market_master;")
                count = cursor.fetchone()["count"]
            if count == 0:
                logger.info("Market Intelligence database is empty. Triggering initial sync in background thread...")
                thread = threading.Thread(target=sync_market_prices, daemon=True, name="MarketPricesInitialSync")
                thread.start()
            else:
                logger.info(f"Market Intelligence database has {count} markets. Skipping initial sync.")
        except Exception as e:
            logger.error(f"Error checking Market Intelligence database empty state: {e}")

        return _scheduler
    except Exception as e:
        logger.error(f"Failed to start background scheduler: {e}")
        return None


def shutdown_scheduler():
    """Shuts down the scheduler if running."""
    global _scheduler
    if _scheduler is not None and _scheduler.running:
        _scheduler.shutdown(wait=False)
        logger.info("AgriMitra BackgroundScheduler shutdown.")
