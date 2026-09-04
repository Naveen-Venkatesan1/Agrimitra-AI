import os
import logging
import firebase_admin
from firebase_admin import credentials, messaging, firestore

logger = logging.getLogger("notifications.firebase_service")

def get_firebase_app():
    """
    Retrieves the existing initialized Firebase App, or initializes a new one
    using environment credentials if not already active.
    """
    try:
        return firebase_admin.get_app()
    except ValueError:
        # App does not exist, initialize it
        project_id = os.environ.get("FIREBASE_PROJECT_ID")
        client_email = os.environ.get("FIREBASE_CLIENT_EMAIL")
        private_key = os.environ.get("FIREBASE_PRIVATE_KEY")

        if not project_id or not client_email or not private_key:
            logger.error("Firebase Admin SDK credentials not configured in environment variables.")
            return None

        try:
            # Safely parse private key linebreaks and normalize PEM headers to exactly 5 hyphens
            formatted_private_key = private_key.replace("\\n", "\n")
            if "BEGIN PRIVATE KEY" in formatted_private_key:
                import re
                formatted_private_key = re.sub(r'-*BEGIN PRIVATE KEY-*', '-----BEGIN PRIVATE KEY-----', formatted_private_key)
                formatted_private_key = re.sub(r'-*END PRIVATE KEY-*', '-----END PRIVATE KEY-----', formatted_private_key)
            
            cred = credentials.Certificate({
                "type": "service_account",
                "project_id": project_id,
                "private_key": formatted_private_key,
                "client_email": client_email,
                "token_uri": "https://oauth2.googleapis.com/token",
            })
            
            app = firebase_admin.initialize_app(cred)
            logger.info("Firebase Admin SDK successfully initialized.")
            return app
        except Exception as e:
            logger.error(f"Failed to initialize Firebase Admin app: {e}")
            return None

def get_firestore_client():
    """
    Retrieves the Firestore client from the initialized Firebase App.
    """
    app = get_firebase_app()
    if not app:
        return None
    try:
        return firestore.client()
    except Exception as e:
        logger.error(f"Failed to get Firestore client: {e}")
        return None

def send_push_notification(token: str, title: str, body: str, data: dict = None) -> bool:
    """
    Sends a Firebase Cloud Messaging push notification to the specified device token.
    Cleans up expired or invalid tokens without exposing configuration secrets.
    """
    app = get_firebase_app()
    if not app:
        logger.error("Cannot send FCM message: Firebase Admin SDK is not initialized.")
        return False

    if not token:
        logger.warning("FCM send requested but registration token is empty.")
        return False

    message = messaging.Message(
        notification=messaging.Notification(
            title=title,
            body=body,
        ),
        data=data or {},
        token=token
    )

    try:
        response = messaging.send(message)
        logger.info(f"FCM notification successfully dispatched. Response: {response}")
        return True
    except messaging.ApiCallError as e:
        if e.code == 'registration-token-not-registered' or 'not-registered' in str(e).lower():
            logger.warning(f"Target FCM token is invalid or unregistered. Token will be discarded: {token}")
            # Try to remove the stale token from Firestore to save resources
            try:
                db = get_firestore_client()
                if db:
                    users_ref = db.collection('users')
                    query_ref = users_ref.where('fcmToken', '==', token).limit(5)
                    docs = query_ref.get()
                    for doc in docs:
                        doc.reference.update({'fcmToken': None})
                        logger.info(f"Cleared unregistered token from user {doc.id} document.")
            except Exception as db_err:
                logger.error(f"Failed to clean up stale FCM token: {db_err}")
        else:
            logger.error(f"Firebase Messaging API call error: {e}")
        return False
    except Exception as e:
        logger.error(f"FCM send error: {e}")
        return False
