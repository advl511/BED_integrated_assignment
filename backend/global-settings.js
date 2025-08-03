// Enhanced Global Settings System with Extended Translations
// Include this script in ALL your HTML pages

class GlobalSettings {
  constructor() {
    this.settings = {
      language: 'en',
      fontSize: 'medium',
      theme: 'light',
      timeFormat: '12h'
    };
  }

  async loadSettings() {
    try {
      const userId = localStorage.getItem("userId") || "1";
      const response = await fetch(`/api/settings/${userId}`);
      
      if (response.ok) {
        this.settings = await response.json();
        console.log("🌍 Global settings loaded:", this.settings);
        this.applyAllSettings();
      } else {
        console.log("🌍 Using default settings");
        this.applyAllSettings();
      }
    } catch (error) {
      console.error("❌ Error loading global settings:", error);
      this.applyAllSettings();
    }
  }

  applyAllSettings() {
    this.applyTheme(this.settings.theme);
    this.applyFontSize(this.settings.fontSize);
    this.applyLanguage(this.settings.language);
    console.log("✅ All global settings applied");
  }

  applyTheme(theme) {
    const htmlEl = document.documentElement;
    
    // Remove all theme classes first
    htmlEl.classList.remove("dark-theme", "light-theme");
    
    if (theme === "dark") {
      htmlEl.classList.add("dark-theme");
      document.body.style.backgroundColor = "#1a1a1a";
      document.body.style.color = "#ffffff";
    } else if (theme === "light") {
      htmlEl.classList.add("light-theme");
      document.body.style.backgroundColor = "#ffffff";
      document.body.style.color = "#333333";
    } else if (theme === "system") {
      const isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (isDark) {
        htmlEl.classList.add("dark-theme");
        document.body.style.backgroundColor = "#1a1a1a";
        document.body.style.color = "#ffffff";
      } else {
        htmlEl.classList.add("light-theme");
        document.body.style.backgroundColor = "#ffffff";
        document.body.style.color = "#333333";
      }
    }
    
    console.log("🎨 Theme applied globally:", theme);
  }

  applyFontSize(fontSize) {
    const sizes = {
      "small": "14px",
      "medium": "18px", 
      "large": "22px",
      "xlarge": "26px"
    };
    
    const size = sizes[fontSize] || "18px";
    
    // Apply to root CSS variable
    document.documentElement.style.setProperty('--global-font-size', size);
    
    // Apply to body
    document.body.style.fontSize = size;
    
    // Apply to common elements
    const elements = document.querySelectorAll('p, div, span, label, button, select, input, a, li');
    elements.forEach(el => {
      el.style.fontSize = size;
    });
    
    console.log("🔡 Font size applied globally:", fontSize, size);
  }

  applyLanguage(language) {
    // Simple language application - change page content based on language
    document.documentElement.lang = language;
    
    // Store language for other scripts to use 
    localStorage.setItem('currentLanguage', language);
    
    // Apply basic translations to common elements
    this.translateCommonElements(language);
    
    console.log("🌍 Language applied globally:", language);
  }

  translateCommonElements(language) {
    const translations = {
  en: {
    'Preferred Language': 'Preferred Language',
    'Select your language': 'Select your language',
    Save: 'Save',
    'Community Hub': 'Community Hub',
    'Welcome Back!': 'Welcome Back!',
    "Good morning! Here's what's happening in your community today. Stay connected with local events, important announcements, and helpful resources.":
      "Good morning! Here's what's happening in your community today. Stay connected with local events, important announcements, and helpful resources.",
    "Today's Events": "Today's Events",
    'Morning Tai Chi at Community Center': 'Morning Tai Chi at Community Center',
    'Book Club Meeting': 'Book Club Meeting',
    'Health Screening at Clinic': 'Health Screening at Clinic',
    'Weather & Prayer Times': 'Weather & Prayer Times',
    'Today: Partly Cloudy, 28°C': 'Today: Partly Cloudy, 28°C',
    'Perfect weather for outdoor activities!': 'Perfect weather for outdoor activities!',
    'Next Prayer: Maghrib at 6:45 PM': 'Next Prayer: Maghrib at 6:45 PM',
    'Health Reminders': 'Health Reminders',
    "Don't forget to take your medication:": "Don't forget to take your medication:",
    'Morning vitamins - Completed': 'Morning vitamins - Completed',
    'Afternoon medication - 2:00 PM': 'Afternoon medication - 2:00 PM',
    'Evening medication - 7:00 PM': 'Evening medication - 7:00 PM',
    'Recent Announcements': 'Recent Announcements',
    'Road Closure: Woodlands Avenue 1 will be closed for maintenance this weekend.':
      'Road Closure: Woodlands Avenue 1 will be closed for maintenance this weekend.',
    'New Activity: Senior Swimming classes starting next Monday at 9 AM.':
      'New Activity: Senior Swimming classes starting next Monday at 9 AM.',
    'Health Talk: Free diabetes screening next Friday at the community center.':
      'Health Talk: Free diabetes screening next Friday at the community center.',
    'Call Family': 'Call Family',
    'Transport Schedule': 'Transport Schedule',
    'Health Services': 'Health Services',
    'Emergency Help': 'Emergency Help',
  },
  zh: {
    'Preferred Language': '首选语言',
    'Select your language': '选择你的语言',
    Save: '保存',
    'Community Hub': '社区中心',
    'Welcome Back!': '欢迎回来！',
    "Good morning! Here's what's happening in your community today. Stay connected with local events, important announcements, and helpful resources.":
      '早上好！以下是今天社区的动态。关注本地活动、重要公告和实用资源。',
    "Today's Events": '今天的活动',
    'Morning Tai Chi at Community Center': '社区中心晨间太极',
    'Book Club Meeting': '读书会会议',
    'Health Screening at Clinic': '诊所健康检查',
    'Weather & Prayer Times': '天气与祷告时间',
    'Today: Partly Cloudy, 28°C': '今天：局部多云，28°C',
    'Perfect weather for outdoor activities!': '适合户外活动的好天气！',
    'Next Prayer: Maghrib at 6:45 PM': '下次祷告：傍晚祷告，下午6:45',
    'Health Reminders': '健康提醒',
    "Don't forget to take your medication:": '别忘了服药：',
    'Morning vitamins - Completed': '早上维生素 - 已完成',
    'Afternoon medication - 2:00 PM': '下午药物 - 下午2:00',
    'Evening medication - 7:00 PM': '晚上药物 - 晚上7:00',
    'Recent Announcements': '近期公告',
    'Road Closure: Woodlands Avenue 1 will be closed for maintenance this weekend.':
      '道路封闭：本周末将封闭兀兰1道进行维护。',
    'New Activity: Senior Swimming classes starting next Monday at 9 AM.':
      '新活动：长者游泳班将于下周一上午9点开始。',
    'Health Talk: Free diabetes screening next Friday at the community center.':
      '健康讲座：下周五社区中心将提供免费的糖尿病筛查。',
    'Call Family': '拨打家人电话',
    'Transport Schedule': '交通时刻表',
    'Health Services': '健康服务',
    'Emergency Help': '紧急求助',
  },
  es: {
    'Preferred Language': 'Idioma preferido',
    'Select your language': 'Seleccione su idioma',
    Save: 'Guardar',
    'Community Hub': 'Centro Comunitario',
    'Welcome Back!': '¡Bienvenido de nuevo!',
    "Good morning! Here's what's happening in your community today. Stay connected with local events, important announcements, and helpful resources.":
      '¡Buenos días! Esto es lo que pasa hoy en tu comunidad. Mantente informado con eventos locales, anuncios importantes y recursos útiles.',
    "Today's Events": 'Eventos de hoy',
    'Morning Tai Chi at Community Center': 'Tai Chi matutino en el centro comunitario',
    'Book Club Meeting': 'Reunión del club de lectura',
    'Health Screening at Clinic': 'Chequeo de salud en la clínica',
    'Weather & Prayer Times': 'Clima y horarios de oración',
    'Today: Partly Cloudy, 28°C': 'Hoy: Parcialmente nublado, 28°C',
    'Perfect weather for outdoor activities!': '¡Clima perfecto para actividades al aire libre!',
    'Next Prayer: Maghrib at 6:45 PM': 'Próxima oración: Maghrib a las 6:45 PM',
    'Health Reminders': 'Recordatorios de salud',
    "Don't forget to take your medication:": 'No olvides tomar tus medicamentos:',
    'Morning vitamins - Completed': 'Vitaminas matutinas - Completadas',
    'Afternoon medication - 2:00 PM': 'Medicamento de la tarde - 2:00 PM',
    'Evening medication - 7:00 PM': 'Medicamento de la noche - 7:00 PM',
    'Recent Announcements': 'Anuncios Recientes',
    'Road Closure: Woodlands Avenue 1 will be closed for maintenance this weekend.':
      'Cierre de carretera: Woodlands Avenue 1 estará cerrada por mantenimiento este fin de semana.',
    'New Activity: Senior Swimming classes starting next Monday at 9 AM.':
      'Nueva actividad: Clases de natación para mayores comienzan el próximo lunes a las 9 AM.',
    'Health Talk: Free diabetes screening next Friday at the community center.':
      'Charla de salud: Prueba gratuita de diabetes el próximo viernes en el centro comunitario.',
    'Call Family': 'Llamar a la familia',
    'Transport Schedule': 'Horario de transporte',
    'Health Services': 'Servicios de salud',
    'Emergency Help': 'Ayuda de emergencia',
  },
  kr: {
    'Preferred Language': '선호 언어',
    'Select your language': '언어를 선택하세요',
    Save: '저장',
    'Community Hub': '커뮤니티 허브',
    'Welcome Back!': '다시 오신 것을 환영합니다!',
    "Good morning! Here's what's happening in your community today. Stay connected with local events, important announcements, and helpful resources.":
      '좋은 아침입니다! 오늘 커뮤니티에서 일어나는 일을 확인하세요. 지역 이벤트, 중요한 공지사항, 유용한 자료를 확인하세요.',
    "Today's Events": '오늘의 이벤트',
    'Morning Tai Chi at Community Center': '커뮤니티 센터에서 아침 태극권',
    'Book Club Meeting': '독서 클럽 모임',
    'Health Screening at Clinic': '클리닉 건강 검진',
    'Weather & Prayer Times': '날씨 및 기도 시간',
    'Today: Partly Cloudy, 28°C': '오늘: 부분적으로 흐림, 28°C',
    'Perfect weather for outdoor activities!': '야외 활동에 완벽한 날씨!',
    'Next Prayer: Maghrib at 6:45 PM': '다음 기도: 마그리브 오후 6:45',
    'Health Reminders': '건강 알림',
    "Don't forget to take your medication:": '약 복용을 잊지 마세요:',
    'Morning vitamins - Completed': '아침 비타민 - 완료됨',
    'Afternoon medication - 2:00 PM': '오후 약 - 오후 2시',
    'Evening medication - 7:00 PM': '저녁 약 - 오후 7시',
    'Recent Announcements': '최근 공지사항',
    'Road Closure: Woodlands Avenue 1 will be closed for maintenance this weekend.':
      '도로 폐쇄: 이번 주말에는 Woodlands Avenue 1이 유지보수로 폐쇄됩니다.',
    'New Activity: Senior Swimming classes starting next Monday at 9 AM.':
      '새 활동: 시니어 수영 수업이 다음 주 월요일 오전 9시에 시작됩니다.',
    'Health Talk: Free diabetes screening next Friday at the community center.':
      '건강 강연: 다음 주 금요일 커뮤니티 센터에서 무료 당뇨병 검사가 있습니다.',
    'Call Family': '가족에게 전화하기',
    'Transport Schedule': '교통 일정',
    'Health Services': '보건 서비스',
    'Emergency Help': '응급 도움',
  },
  ja: {
    'Preferred Language': '希望言語',
    'Select your language': '言語を選択してください',
    Save: '保存',
    'Community Hub': 'コミュニティハブ',
    'Welcome Back!': 'おかえりなさい！',
    "Good morning! Here's what's happening in your community today. Stay connected with local events, important announcements, and helpful resources.":
      'おはようございます！ 今日のコミュニティの出来事をチェックしましょう。 地域のイベント、重要なお知らせ、役立つ情報をご確認ください。',
    "Today's Events": '本日のイベント',
    'Morning Tai Chi at Community Center': 'コミュニティセンターでの朝の太極拳',
    'Book Club Meeting': '読書クラブの会合',
    'Health Screening at Clinic': 'クリニックでの健康診断',
    'Weather & Prayer Times': '天気と祈りの時間',
    'Today: Partly Cloudy, 28°C': '今日：曇り時々晴れ、28°C',
    'Perfect weather for outdoor activities!': '屋外活動に最適な天気です！',
    'Next Prayer: Maghrib at 6:45 PM': '次の祈り：マグリブ午後6時45分',
    'Health Reminders': '健康リマインダー',
    "Don't forget to take your medication:": '薬を忘れずに服用してください：',
    'Morning vitamins - Completed': '朝のビタミン - 完了',
    'Afternoon medication - 2:00 PM': '午後の薬 - 午後2時',
    'Evening medication - 7:00 PM': '夜の薬 - 午後7時',
    'Recent Announcements': '最近のお知らせ',
    'Road Closure: Woodlands Avenue 1 will be closed for maintenance this weekend.':
      '道路閉鎖：今週末はウッドランズアベニュー1がメンテナンスのため閉鎖されます。',
    'New Activity: Senior Swimming classes starting next Monday at 9 AM.':
      '新しいアクティビティ：シニア向けの水泳クラスが来週月曜日午前9時に始まります。',
    'Health Talk: Free diabetes screening next Friday at the community center.':
      '健康講座：来週金曜日にコミュニティセンターで無料の糖尿病検診があります。',
    'Call Family': '家族に電話',
    'Transport Schedule': '交通スケジュール',
    'Health Services': '健康サービス',
    'Emergency Help': '緊急支援',
  },
};


    const texts = translations[language] || translations['en'];
    
    // Update page title if it contains common words
    Object.keys(texts).forEach(key => {
      if (document.title.includes(key)) {
        document.title = document.title.replace(new RegExp(key, 'g'), texts[key]);
      }
    });
    
    // Update common buttons and elements by their text content
    const elements = document.querySelectorAll('button, a, h1, h2, h3, h4, h5, h6, label, span, div, p, td, th, option, li');
    elements.forEach(el => {
      let text = el.textContent.trim();
      
      // Skip elements that are too long (likely not simple UI text)
      if (text.length > 50) return;
      
      // Check if element contains translatable text (remove emojis and extra chars)
      const cleanText = text.replace(/[⚙️🌍🔡🎨🕒💾↺←→✅❌🎯📧📞🏠👤📊📋🔍📤📥🖨️📤📋📊🔒🔓❓ℹ️⚠️✓❌]/g, '').trim();
      
      // Apply translations for each word/phrase
      Object.keys(texts).forEach(key => {
        if (cleanText === key || text.includes(key)) {
          el.textContent = text.replace(new RegExp(key, 'g'), texts[key]);
        }
      });
    });
    
    // Update placeholder text in input fields
    const inputs = document.querySelectorAll('input[placeholder], textarea[placeholder]');
    inputs.forEach(input => {
      const placeholder = input.getAttribute('placeholder');
      Object.keys(texts).forEach(key => {
        if (placeholder && placeholder.includes(key)) {
          input.setAttribute('placeholder', placeholder.replace(new RegExp(key, 'g'), texts[key]));
        }
      });
    });
    
    // Update alt text for images
    const images = document.querySelectorAll('img[alt]');
    images.forEach(img => {
      const alt = img.getAttribute('alt');
      Object.keys(texts).forEach(key => {
        if (alt && alt.includes(key)) {
          img.setAttribute('alt', alt.replace(new RegExp(key, 'g'), texts[key]));
        }
      });
    });
  }

  // Method to get translated text programmatically
  getTranslation(key, language = null) {
    const lang = language || this.settings.language;
    const translations = this.getTranslations();
    return translations[lang]?.[key] || translations['en'][key] || key;
  }

  // Method to get all translations (useful for other scripts)
  getTranslations() {
    // Return the same translations object used in translateCommonElements
    // This allows other parts of your application to access translations
    return this.translateCommonElements.__translations || {};
  }

  // Method to update settings (called from settings page)
  updateSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings };
    this.applyAllSettings();
  }
}

// Create global instance
window.globalSettings = new GlobalSettings();

// Auto-load settings when page loads
document.addEventListener('DOMContentLoaded', () => {
  window.globalSettings.loadSettings();
});