import fs from 'fs';
import path from 'path';

const keys = {
  en: {
    notifications_active: 'Notifications are Active',
    notifications_desc: "You'll receive farm condition based watering reminders."
  },
  ta: {
    notifications_active: 'அறிவிப்புகள் செயலில் உள்ளன',
    notifications_desc: 'பண்ணை சூழல் சார்ந்த பாசன நினைவூட்டல்களைப் பெறுவீர்கள்.'
  },
  hi: {
    notifications_active: 'सूचनाएं सक्रिय हैं',
    notifications_desc: 'आपको खेत की स्थिति पर आधारित सिंचाई अनुस्मारक प्राप्त होंगे।'
  },
  te: {
    notifications_active: 'నోటిఫికేషన్‌లు యాక్టివ్‌గా ఉన్నాయి',
    notifications_desc: 'మీరు వ్యవసాయ పరిస్థితుల ఆధారిత నీటిపారుదల రిమైండర్‌లను అందుకుంటారు.'
  },
  ml: {
    notifications_active: 'അറിയിപ്പുകൾ സജീവമാണ്',
    notifications_desc: 'ഫാം സാഹചര്യങ്ങളെ അടിസ്ഥാനമാക്കിയുള്ള ജലസേചന ഓർമ്മപ്പെടുത്തലുകൾ നിങ്ങൾക്ക് ലഭിക്കും.'
  }
};

const dir = path.resolve('src/locales');
for (const file of fs.readdirSync(dir)) {
  if (file.endsWith('.json')) {
    const lang = path.basename(file, '.json');
    const fullPath = path.join(dir, file);
    const data = JSON.parse(fs.readFileSync(fullPath, 'utf-8'));
    const tDict = keys[lang] || keys.en;
    Object.assign(data, tDict);
    fs.writeFileSync(fullPath, JSON.stringify(data, null, 2) + '\n');
    console.log('Updated', file);
  }
}
