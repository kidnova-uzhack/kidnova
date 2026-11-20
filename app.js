(() => {
  'use strict';
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const baseEn = {};
  $$('[data-i18n]').forEach(el => baseEn[el.dataset.i18n] ??= el.textContent.trim());
  $$('[data-i18n-html]').forEach(el => baseEn[el.dataset.i18nHtml] ??= el.innerHTML.trim());

  const uz = {
    skip:'Asosiy mazmunga o‘tish',navAbout:'Biz haqimizda',navSolution:'Yechim',navTechnology:'Texnologiya',navRoadmap:'Yo‘l xaritasi',navBusiness:'Biznes',navTeam:'Jamoa',navContact:'Aloqa',navDemo:'Jonli simulyatsiya',
    heroEyebrow:'UzHack 2026 · Pediatrik HealthTech',heroTitle:'Har bir kichik kelajak uchun <em>aqlli g‘amxo‘rlik.</em>',heroText:'Bog‘chalarga muhim salomatlik ko‘rsatkichlarini kuzatish, ota-onalarni xabardor qilish va o‘z vaqtida tibbiy kuzatuvni qo‘llab-quvvatlashga yordam beradigan bog‘langan pediatrik skrining ekotizimini yaratmoqdamiz.',explore:'KidNova bilan tanishing',tryDemo:'Interaktiv demoni sinang',trust1:'Sun’iy demo ma’lumotlari',trust2:'Inson nazoratidagi konsepsiya',trust3:'Tashxis qurilmasi emas',screenStatus:'SKRINING HOLATI',ready:'Tayyor',sampleReading:'NAMUNA KO‘RSATKICH',synthetic:'Sun’iy ma’lumot',pause:'To‘xtatish',resetView:'Ko‘rinishni tiklash',startFergana:'Farg‘ona, O‘zbekistondan boshlanadi',bridge:'O‘zbekiston–Malayziya texnologik ko‘prigi',
    aboutKicker:'KidNova haqida',aboutTitle:'Bolaning <span>skrining jarayoni</span> atrofidagi yagona tizim.',aboutP1:'KidNova — bog‘chalar uchun pediatrik HealthTech konsepsiyasi. U bolalarga mos skrining, shaxsga bog‘langan yozuvlar, ota-onalar bilan aloqa va mas’uliyatli insoniy kuzatuvni birlashtiradi.',aboutP2:'UzHack 2026 uchun yaratilgan loyiha Farg‘onadagi oilalar va bog‘chalar ehtiyojlaridan boshlanadi hamda O‘zbekiston–Malayziya texnologik ko‘prigi doirasida rivojlantirilmoqda.',whoTitle:'Kimlar uchun',whoText:'Bolalar, ota-onalar, bog‘cha xodimlari va zarur kuzatuvda qatnashadigan tibbiyot mutaxassislari.',whyTitle:'Nima uchun yaratilgan',whyText:'Muhim skrining ma’lumotlarini aniqroq, bog‘langan va mas’uliyatli tarzda harakat qilishga qulay qilish uchun.',focusTitle:'Dastlabki yo‘nalish',focusText:'Farg‘ona, O‘zbekistonda nazorat ostidagi bog‘cha pilotiga tayyorgarlik.',
    visionLabel:'Bizning qarashimiz',visionText:'O‘zbekistondagi bog‘chalardan boshlab, bolalar salomatligini profilaktik kuzatishni yanada qulay, bog‘langan va faol qilish.',missionLabel:'Bizning vazifamiz',missionText:'Skrining, raqamli yozuvlar, ota-onalar, tarbiyachilar va tibbiyot mutaxassislarini bog‘laydigan hamyonbop, bolalarga mos texnologik ekotizim yaratish.',valueSafety:'Bola xavfsizligi',valuePrevention:'Profilaktik salomatlik',valueAccess:'Qulaylik',valueTech:'Mas’uliyatli texnologiya',valuePrivacy:'Maxfiylik va ishonch',valueLocal:'Mahalliy innovatsiya',valueImpact:'Ijtimoiy ta’sir',
    problemKicker:'Muammo',problemTitle:'Muhim signallar <span>uzilib qolishi mumkin.</span>',problemIntro:'KidNova to‘rtta amaliy jarayon muammosidan boshlaydi. Tasdiqlanmagan raqamlar yo‘q — faqat o‘rganish va tekshirish kerak bo‘lgan aniq masalalar.',problem1Title:'Tizimlilik yetishmasligi',problem1Text:'Salomatlik ko‘rsatkichlari bog‘chada yagona, izchil jarayon orqali kuzatilmasligi mumkin.',problem2Title:'Trendlar ko‘rinmasligi',problem2Text:'Ota-onalarda bo‘y va vazn o‘zgarishlarining aniq uzoq muddatli ko‘rinishi bo‘lmasligi mumkin.',problem3Title:'Kechikkan aloqa',problem3Text:'E’tibor talab qiladigan holatlar kech yoki nomuntazam yetkazilishi mumkin.',problem4Title:'Tarqoq kuzatuv',problem4Text:'Skrining yozuvlari va keyingi kuzatuv ma’lumotlari turli joylarda saqlanishi mumkin.',
    solutionKicker:'KidNova yechimi',solutionTitle:'Uzluksizlik atrofida qurilgan <span>taklif etilayotgan ekotizim.</span>',solutionIntro:'Dasturiy jarayonlar hozir mavjud. Qurilma, xavfsiz RFID integratsiyasi va real skrining qo‘shimcha ishlab chiqish va tekshiruvni talab qiladi.',ecosystem:'Bog‘langan skrining ekotizimi',sol1:'Simulyatsiya qilingan RFID',inDev:'Ishlab chiqilmoqda',sol2:'Harorat skriningi',plannedValidation:'Rejalashtirilgan · tekshiruv talab qiladi',sol3:'Bo‘y va vazn',sol4:'Raqamli tarix',implemented:'Amalga oshirilgan',sol5:'Ota-ona xabarlari',sol6:'Nazorat ostidagi kuzatuv',workflowConcept:'Jarayon konsepsiyasi',
    workflowKicker:'KidNova qanday ishlaydi',workflowTitle:'Kelishdan mas’uliyatli <span>kuzatuvgacha.</span>',step1:'Bola keladi',step2:'RFID bilaguzuk',step3:'Skrining',step4:'Yozib olish',step5:'Ko‘rsatkich tekshiruvi',step6:'Ota-onaga xabar',step7:'Insoniy kuzatuv',
    demoKicker:'Interaktiv prototip',demoTitle:'Simulyatsiya qilingan <span>skrining jarayonini</span> sinang.',demoIntro:'Ulanish sozlangach, uydirma bolalar uchun simulyatsiya qilingan RFID, infraqizil harorat va davomat yozuvlari Supabase’da saqlanadi. Telegram xabar yuborilmaydi — faqat preview yozuvi saqlanadi.',prototype:'INTERAKTIV PROTOTIP',demoSelect:'Bolani tanlash',demoIdentify:'RFID identifikatsiya',demoMeasure:'Skrining',demoResults:'Natijalar',demoNotify:'Xabar',simulationOnly:'Faqat sintetik ma’lumot. Tibbiy tashxis emas.',stationOnline:'Dasturiy demo tayyor',restart:'Qayta boshlash',selectTitle:'Uydirma bolani tanlang',selectText:'Barcha profillar va o‘lchovlar sun’iy.',childA:'Demo bola A',age4:'4 yosh · Uydirma profil',childB:'Demo bola B',childC:'Demo bola C',childD:'Demo bola D',childE:'Demo bola E',childF:'Demo bola F',age3:'3 yosh · Uydirma profil',age6:'6 yosh · Uydirma profil',age5:'5 yosh · Uydirma profil',scenario:'Simulyatsiya ssenariysi',routine:'Oddiy',attention:'E’tibor talab qiladi',begin:'Skriningni boshlash',identifyTitle:'RFID bilaguzuk simulyatsiyasi',identifyText:'Simulyatsiya qilingan bilaguzuk tanlangan demo profilni aniqlaydi.',scanning:'RFID bilaguzuk tekshirilmoqda…',noCamera:'Haqiqiy RFID apparati ishlatilmaydi.',continue:'Davom etish',screeningTitle:'Simulyatsiya skriningi davom etmoqda',screeningText:'Harorat — simulyatsiya qilingan infraqizil sensor qiymati.',processing:'Ishlanmoqda',temperature:'Simulyatsiya harorati',height:'Bo‘y',weight:'Vazn',resultsTitle:'Sun’iy skrining natijalari',withinDemo:'Demo oralig‘ida',reviewComplete:'Ko‘rsatkichlar tekshiruvi tugadi',routineNote:'Ushbu simulyatsiyada sozlangan ogohlantirish ishga tushmadi.',viewNotification:'Ota-ona xabarini ko‘rish',notificationTitle:'Ota-ona uchun xabar namunasi',notificationText:'Faqat ko‘rib chiqish uchun — Telegram xabari yuborilmaydi.',justNow:'hozirgina',contactProfessional:'Xavotir bo‘lsa, malakali tibbiyot mutaxassisiga murojaat qiling.',tryAnother:'Boshqa ssenariyni sinash',
    mvpKicker:'Joriy MVP',mvpTitle:'Nima mavjudligi va <span>keyingi qadamlar</span> aniq ko‘rsatilgan.',inDevelopment:'Ishlab chiqilmoqda',planned:'Rejalashtirilgan',requiresValidation:'Tekshiruv talab qiladi',mvp1:'Python Telegram bot',mvp2:'Bolani ro‘yxatdan o‘tkazish jarayoni',mvp3:'Salomatlik skriningi tarixi',mvp4:'Ota-onaga xabar berish jarayoni',mvp5:'Ochiq loyiha sayti',mvp6:'Xavfsiz RFID identifikatsiya integratsiyasi',mvp7:'Takomillashtirilgan skrining jarayoni',mvp8:'Tadqiqot dalillarini to‘plash',mvp9:'Jismoniy robot prototipi',mvp10:'Sensor integratsiyasi',mvp11:'Bog‘cha piloti',mvp12:'Texniklar tarmog‘i',mvp13:'Qurilma aniqligi va ishonchliligi',mvp14:'Real jarayon qulayligi',mvp15:'Klinik yo‘naltirish protokollari',
    roadmapKicker:'Rivojlanish yo‘l xaritasi',roadmapTitle:'Konsepsiyadan kengayishgacha <span>dalillarga asoslangan uch bosqich.</span>',stage1Short:'MVP va tekshiruv',currentStage:'Joriy bosqich',stage2Short:'Farg‘ona piloti',stage3Short:'Hududiy kengayish',
    differentKicker:'KidNova nimasi bilan farq qiladi',differentTitle:'Integratsiya — asosiy <span>dizayn gipotezasi.</span>',differentIntro:'Jarayon yondashuvlarining xolis, dalillarga ehtiyotkor taqqoslanishi. Alohida mahsulotlarda imkoniyatlar farq qilishi mumkin.',approach:'Yondashuv',identityRecords:'Shaxsga bog‘langan yozuvlar',parentComms:'Ota-ona aloqasi',growthVisibility:'O‘sish ko‘rinishi',humanFollow:'Insoniy kuzatuv',localSupport:'Mahalliy yordam rejasi',manual:'Qo‘lda skrining',standalone:'Alohida qurilmalar',recordPlatforms:'Raqamli yozuv platformalari',proposed:'taklif etilayotgan yondashuv',designedFor:'Ko‘zda tutilgan',mayVary:'Farq qilishi mumkin',notCore:'Asosiy emas',
    businessKicker:'Biznes model gipotezasi',businessTitle:'Bir martalik qurilma emas, <span>barqaror xizmat</span> uchun.',businessIntro:'Narx va talab hali tasdiqlanmagan. Bular kelajakda sinash uchun taklif etilayotgan daromad yo‘nalishlari.',targetCustomers:'MAQSADLI MIJOZLAR',customer1:'Xususiy bog‘chalar',customer2:'Mos davlat muassasalari',customer3:'Bolalar parvarishi operatorlari',customer4:'Salomatlik bo‘yicha hamkorlar',serviceEcosystem:'Xizmat ekotizimi',potentialRevenue:'EHTIMOLIY DAROMAD',revenue1:'Qurilma savdosi yoki ijarasi',revenue2:'Oylik dastur obunasi',revenue3:'O‘rnatish va ishga tushirish',revenue4:'Texnik xizmat va yordam',recurringTitle:'Uzoq muddatli xizmat aloqasi',recurringText:'Dastur, texnik xizmat va yordam kelajakdagi tekshiruvdan so‘ng davomli xizmat modelini yaratishi mumkin.',noPrices:'Tasdiqlangan narx yoki prognoz yo‘q',
    techNetworkKicker:'Rejalashtirilgan xizmat tarmog‘i',techNetworkTitle:'Mahalliy ishonchlilik — <span>mahalla texniklari tarmog‘i</span> orqali.',techNetworkText:'KidNova qurilmalarni tekshiradigan, qismlarni almashtiradigan, nosozliklarni bartaraf etadigan va bog‘cha xodimlariga yordam beradigan mahalliy texniklarni tayyorlash va muvofiqlashtirishni rejalashtiradi.',plannedFunctionality:'Rejalashtirilgan imkoniyat · Hali faol emas',localTechnician:'Mahalliy texnik',kindergarten:'Bog‘cha',maintenance:'Texnik xizmat',parts:'Komponentlar',support:'Xodimlarga yordam',benefit1:'Mahalliy bandlik',benefit2:'Tezroq yordam',benefit3:'Yuqori ishonchlilik',benefit4:'Texnik ko‘nikmalar',benefit5:'Hududiy kengayish',
    architectureKicker:'Texnologik arxitektura',architectureTitle:'Mavjud dastur, taklif etilgan qurilma — <span>aniq ajratilgan.</span>',proposedHardware:'TAKLIF ETILGAN QURILMA · TEKSHIRUV TALAB QILADI',station:'Skrining stansiyasi',sensors:'Sensorlar',qrIdentity:'Simulyatsiya qilingan RFID',futureIntegration:'Kelajakdagi integratsiya',existingSoftware:'MAVJUD DASTURIY MVP',pythonBackend:'Python bot jarayoni',childProfiles:'Bola profillari va tarix',telegram:'Telegram xabarlari',communication:'Aloqa',usersFuture:'FOYDALANUVCHILAR VA KELAJAK INTERFEYSI',parents:'Ota-onalar',staff:'Bog‘cha xodimlari',adminDashboard:'Kelajak admin paneli',architectureNote:'Jonli MVP backendi: Supabase Postgres va Auth. 2026-yil 9-noyabrda hosted testlar RLS, rolga bog‘langan RPC, sintetik yozuvlarning saqlanishi, dublikat bloklanishi va ota-ona izolyatsiyasini tasdiqladi. Bu demo validatsiyasi, production xavfsizlik sertifikati emas.',
    trustKicker:'Bola xavfsizligi, maxfiylik va ishonch',trustTitle:'Ishonch joriy etishdan <span>oldin loyihalanadi.</span>',trustIntro:'KidNova nazorat ostidagi skrining jarayonini qo‘llab-quvvatlash uchun mo‘ljallangan — avtonom tashxis uchun emas.',trustCard1:'Rozilik va ochiqlik',trustCard1Text:'Ota-ona yoki vasiyning roziligi va ma’lumot qanday ishlatilishi haqida aniq axborot.',trustCard2:'Cheklangan kirish',trustCard2Text:'Rolga mos kirish, xavfsiz identifikatsiya va kelajakdagi kirish jurnallari.',trustCard3:'Ma’lumot mas’uliyati',trustCard3Text:'Ma’lumotni minimallashtirish, mas’uliyatli saqlash va mos muddat siyosati.',trustCard4:'Inson nazorati',trustCard4Text:'Tayyorlangan xodimlar skrining kontekstini ko‘rib chiqadi va zarur kuzatuvni muvofiqlashtiradi.',trustCard5:'Qurilma ishonchliligi',trustCard5Text:'Har qanday pilotdan oldin kalibrlash, texnik xizmat va ishonchlilik sinovlari.',trustCard6:'Yo‘naltirish protokollari',trustCard6Text:'Malakali mutaxassislar bilan ishlab chiqiladigan aniq eskalatsiya tartibi.',important:'Muhim',regulatoryText:'KidNova tartibga soluvchi tasdiq, klinik validatsiya yoki sertifikatga ega ekanini da’vo qilmaydi. Kelajakdagi joriy etish tegishli ruxsatlar, rozilik, xavfsizlik sinovlari va professional tavsiyalarga bog‘liq.',
    marketKicker:'Bozor imkoniyati',marketTitle:'Aniq yo‘nalishdan boshlang. Mahalliy o‘rganing. <span>Mas’uliyat bilan kengaying.</span>',fergana:'Farg‘ona',initialFocus:'Dastlabki yo‘nalish',ferganaValley:'Farg‘ona vodiysi',regionalLearning:'Hududiy o‘rganish',uzbekistan:'O‘zbekiston',nationalPotential:'Milliy imkoniyat',international:'Xalqaro',futureOpportunity:'Kelajak imkoniyatlari',institutions:'muassasa',tamTitle:'O‘zbekiston bo‘ylab maqsadli bozor',tamText:'O‘zbekistondagi 39 283 ta maktabgacha ta’lim tashkilotidan 10 087 tasi oilaviy nodavlat formatiga kirmaydi. Bu KidNova uchun dastlabki institutsional bozor segmenti sifatida olingan.',samTitle:'Farg‘ona vodiysidagi maqsadli bozor',samText:'Farg‘ona, Andijon va Namangan viloyatlarida jami 12 691 ta maktabgacha ta’lim tashkiloti mavjud. Ulardan 2 785 tasi oilaviy nodavlat formatidan tashqarida bo‘lib, hududiy kengayish uchun dastlabki maqsadli segment hisoblanadi.',somTitle:'Dastlabki joriy etish maqsadi',somText:'Farg‘ona viloyatida 1 183 ta oilaviy bo‘lmagan MTT mavjud. KidNova dastlabki 12–24 oyda texnik va xavfsizlik tekshiruvlari hamda hamkorliklar muvaffaqiyatiga bog‘liq holda 5–10 ta muassasada joriy etishni maqsad qiladi.',somWindow:'12–24 oyda shartli joriy etish',somNote:'Rejalashtirilgan maqsad — tasdiqlangan mijozlar yoki joriy sotuvlar emas.',tamTooltipButton:'TAM haqida',samTooltipButton:'SAM haqida',somTooltipButton:'SOM haqida',tamTooltip:'Ushbu proksi hisob orqali aniqlangan mamlakat bo‘ylab to‘liq institutsional segment.',samTooltip:'TAMning Farg‘ona vodiysida joylashgan va hududiy jihatdan erishish mumkin deb qaralgan qismi.',somTooltip:'Shartli joriy etish ssenariysi — tasdiqlangan talab yoki sotuv emas.',dataTransparency:'MA’LUMOTLAR OCHIQLIGI',methodologyTitle:'Metodologiya va cheklovlar',methodologyToggle:'Metodologiya, cheklovlar va manbalar',nutKicker:'3-MVP · Smart Nutrition',navAdmin:'Admin panel',nutPill:'Ishlaydigan kalkulyator MVP · taxminiy ma’lumot · bog‘chada hali qo‘llanilmagan',mvp16:'Smart Nutrition kaloriya kalkulyatori (taxminiy ma’lumot)',mvp17:'Oziq-ovqat tarkibi ma’lumotlari va dietolog tasdiqlagan ovqatlanish me’yorlari',nutTitle:'KidNova Smart Nutrition — <span>Aqlli ovqatlanish nazorati</span>',nutText:'KidNova Smart Nutrition — bog‘cha oshxona xodimlariga bolalar uchun tayyorlanadigan taomlarning taxminiy kaloriyasi, oqsil, uglevod va yog‘ miqdorini hisoblash, kunlik menyularni rejalashtirish hamda ovqatlanish jarayonini raqamlashtirishda yordam berishi ko‘zda tutilgan modul.',nutFlowTitle:'Qanday ishlaydi',nutFlowNote:'Pastdagi kalkulyatorda sinab ko‘ring',nutStep1:'Ovqat vaqtini tanlash',nutStep1Text:'Nonushta, tushlik, yengil tamaddi yoki kechki ovqat.',nutStep2:'Masalliqlarni kiritish',nutStep2Text:'Masalliq turlari, gramm hisobidagi og‘irligi va porsiyalar soni.',nutStep3:'Hisoblash',nutStep3Text:'Bir porsiya uchun taxminiy kaloriya, oqsil, uglevod va yog‘.',nutStep4:'Tekshirish va saqlash',nutStep4Text:'Oshxona xodimi ovqat berilishidan oldin rejani tasdiqlaydi.',nutResultLabel:'Bir porsiya uchun taxminiy qiymatlar',nutEnergy:'Energiya · kkal',nutProtein:'Oqsil · g',nutCarbs:'Uglevod · g',nutFat:'Yog‘ · g',nutFutureTag:'Prototip integratsiya',nutRfidTitle:'KidNova RFID bilan integratsiya',nutRfidText:'Demoda kalkulyator porsiyalar sonini bugungi simulyatsiya RFID davomatidan (demo xodim hisobi) olishi mumkin, shunda ovqat porsiyalari bog‘chaga kelgan bolalar soniga moslashadi.',nutFlow1:'RFID davomat',nutFlow2:'Bolalar soni',nutFlow3:'Porsiyalarni rejalashtirish',nutFlow4:'Oziqlanish hisoboti',nutRfidNote:'Faqat simulyatsiya qilingan RFID ma’lumoti. Davomat bolaning ovqatni haqiqatda iste’mol qilganini isbotlamaydi.',nutExpectedTag:'Kutilayotgan afzalliklar',nutEconTitle:'Bog‘chalar uchun iqtisodiy afzalliklar',nutEcon1T:'Aniqroq rejalashtirish',nutEcon1:'Bolalar soni asosida kerakli ovqat miqdorini yaxshiroq rejalashtirish.',nutEcon2T:'Isrofni kamaytirish',nutEcon2:'Ortiqcha tayyorlanadigan ovqat miqdorini kamaytirishga yordam berish.',nutEcon3T:'Raqamli boshqaruv',nutEcon3:'Kunlik menyu va oziqlanish ma’lumotlarini yagona tizimda boshqarish.',nutEconNote:'Kutilayotgan afzalliklar — tajribada tasdiqlanmagan. Tejash bo‘yicha raqamlar keltirilmaydi.',nutSafeHead:'Foydalanishdan oldingi rejalashtirilgan talablar',nutSafe1T:'Tekshirilgan oziq-ovqat ma’lumotlari',nutSafe1:'O‘zbekistonga mos oziq-ovqat tarkibi qiymatlari, mahsulot chiqimi va pishirishdagi yo‘qotishlar hisobga olinadi.',nutSafe2T:'Dietolog tasdiqlagan me’yorlar',nutSafe2:'Yoshga mos ozuqaviy me’yorlarni malakali dietolog ko‘rib chiqadi.',nutSafe3T:'Allergenlar haqida ma’lumot',nutSafe3:'Vakolatli xodimlar uchun allergenlar aniq belgilab qo‘yiladi.',nutSafe4T:'Nazoratli kirish',nutSafe4:'Alohida oshxona roli va o‘zgarishlar tarixi; ota-ona va xodim kirishi ajratilgan holda qoladi.',nutNote:'Smart Nutrition tibbiy tashxis vositasi emas, shaxsiy parhez belgilamaydi va malakali dietologni almashtirmaydi. U tekshirilgan oziq-ovqat tarkibi ma’lumotlari va inson nazoratini talab qiladi.',statsReference:'Statistika sanasi: 2026-yil 1-yanvar.',tamFormula:'39 283 − 29 196 = 10 087 ta muassasa.',samFormula:'(4 341 − 3 158) + (4 308 − 3 489) + (4 042 − 3 259) = 2 785 ta muassasa.',somFormula:'Taklif etilgan dastlabki joriy etish ssenariysi, tasdiqlangan bozor talabi emas.',proxyNote:'Muassasalar soni bozor hajmini baholash uchun proksi ko‘rsatkich bo‘lib, tasdiqlangan mijozlar emas.',claimsNote:'Daromad, qurilma narxi, bozor ulushi, institutsional kelishuvlar yoki tijoriy natijalar haqida da’vo qilinmaydi.',sourcesLabel:'Manbalar',sourceStatistics:'Milliy statistika qo‘mitasi',sourceRegional:'Yangi O‘zbekiston hududiy ma’lumotlari',
    researchKicker:'Tadqiqot va tekshiruv',researchTitle:'Dastlabki signallar <span>tasdiqlangan dalillardan</span> ochiq ajratilgan.',researchIntro:'Asoschi ma’lum qilgan faoliyatlar, dastlabki fikrlar, taklif etilgan dizayn yo‘riqnomalari va rejalashtirilgan ishlar alohida belgilangan. Tasdiqlovchi hujjatlar tayyor bo‘lganda ilova qilinishi mumkin.',legendReported:'Asoschi ma’lum qilgan',legendPreliminary:'Dastlabki fikr',legendVerified:'Mustaqil tasdiqlangan: hujjat ilova qilinmagan',legendProposed:'Taklif etilgan dizayn yo‘riqnomasi',legendPlanned:'Rejalashtirilgan faoliyat',founderReportedActivity:'Asoschi ma’lum qilgan faoliyat',notIndependentlyVerified:'Mustaqil tasdiqlanmagan',preliminaryFeedback:'Dastlabki fikr',noInstitutionalEndorsement:'Institutsional ma’qullash da’vo qilinmaydi',plannedActivity:'Rejalashtirilgan faoliyat',notAttached:'Hali ilova qilinmagan',research1:'Ota-onalar so‘rovi',research1Status:'Davom etmoqda · 101 ishtirokchidan 85 nafari',parentSurveyText:'Davom etayotgan so‘rov maktabgacha yoshdagi bolalar salomatligini kuzatish bo‘yicha ota-onalarning xavotirlari va ehtiyojlarini o‘rganadi. Asoschi hozirgacha 85 ishtirokchi qatnashganini ma’lum qilgan; maqsadli tanlanma 101 nafar.',surveyPercent:'84,16% bajarildi',surveyTarget:'Maqsad: 101 ishtirokchi',surveyRemaining:'Qoldi: 16',surveySummarySlot:'So‘rov xulosasi',research2:'Pediatr bilan maslahat',research2Status:'Dastlabki ijobiy fikr',pediatricianText:'Asoschi pediatr bilan dastlabki ijobiy suhbat bo‘lganini ma’lum qilgan. Hozircha suhbat yozuvi ilova qilinmagan, shuning uchun bu mustaqil tasdiqlangan klinik dalil emas, balki dastlabki fikr hisoblanadi.',proposedGuidance:'TAKLIF ETILGAN DIZAYN YO‘RIQNOMASI',clinicalTitle:'Klinik dizayn masalalari',notAttributed:'Maslahatlashilgan pediatrga nisbat berilmaydi',clinical1:'Kontaktsiz infraqizil harorat skriningidan faqat dastlabki ko‘rsatkich sifatida foydalanish.',clinical2:'Xavotirli o‘lchovlarni xodimlar tomonidan qayta tekshirishni talab qilish.',clinical3:'Kelishilgan jarayonlar orqali mas’ul xodimlar va ota-onalarga ogohlantirish yuborish.',clinical4:'Mos standartlardan foydalanib o‘sishni davriy kuzatish.',clinical5:'Maxfiylikni himoya qilish va ota-ona roziligini olish.',clinical6:'Avtomatlashtirilgan tibbiy tashxis qo‘ymaslik.',clinicalDisclaimer:'Ushbu masalalar klinik validatsiya, tibbiy maslahat yoki sertifikat hisoblanmaydi.',consultationNotesSlot:'Maslahat qaydlari',research3:'Bog‘cha xodimlari bilan suhbatlar',research3Status:'Dastlabki ijobiy fikr',staffText:'Asoschi suhbat o‘tkazilgan bog‘cha xodimlaridan ijobiy fikr olinganini ma’lum qilgan. Suhbat yozuvlari hali ilova qilinmagan.',proposedBenefitsTitle:'Taklif etilgan operatsion foydalar',notMeasured:'O‘lchangan samaradorlik yaxshilanishlari emas',staffBenefit1:'Kundalik davomatni tezroq qayd etish',staffBenefit2:'RFID orqali bolani identifikatsiya qilish',staffBenefit3:'Dastlabki harorat tekshiruvlari',staffBenefit4:'Ota-onalarga xabarlar',staffBenefit5:'Takroriy qo‘lda qayd etishni kamaytirish',staffNotesSlot:'Xodimlar suhbati qaydlari',research4:'Universitet mentorlari fikri',research4Status:'Dastlabki ijobiy fikr',mentorText:'Asoschi universitet mentorlaridan ijobiy fikr olinganini ma’lum qilgan. Hozircha mentorlar ismlari, yozma ma’qullashlar yoki institutsional qo‘llab-quvvatlash hujjatlari ilova qilinmagan.',mentorObjectiveTitle:'Loyiha maqsadlari',mentorObjectiveText:'Bolani identifikatsiya qilish, skrining yozuvlari, xodimlar ko‘rigi va ota-onalar bilan aloqani bitta mas’uliyatli jarayonda bog‘lash.',mentorInnovationTitle:'Innovatsion salohiyat',mentorInnovationText:'Bolalarga mos dasturiy jarayon kelajakda tekshirilgan jismoniy skrining komponentlari bilan qanday bog‘lanishi mumkinligini o‘rganish.',mentorRoadmapTitle:'Rivojlanish yo‘l xaritasi',mentorRoadmapText:'Dasturiy tekshiruvdan jismoniy integratsiya, xavfsizlik sinovlari va ruxsatga asoslangan nazoratli pilotga bosqichma-bosqich o‘tish.',mentorNotesSlot:'Mentorlar fikri qaydlari',research5:'Nazorat ostidagi pilot',research5Status:'Rejalashtirilgan',founderReportedPrototype:'Asoschi ma’lum qilgan prototip',pilotCurrent:'KidNova hozirda ikki qismli dasturiy prototipga ega: Python’da yozilgan Telegram bot va Supabase (PostgreSQL) bazasiga ulangan veb-demo.',syntheticTestsTitle:'Sun’iy dasturiy sinovlar',syntheticTest1:'RFID identifikatsiyasi simulyatsiyasi',syntheticTest2:'Takroriy kirishni bloklash',syntheticTest3:'Simulyatsiya qilingan harorat yozuvlari',futureMilestonesTitle:'Kelajak bosqichlari',futureMilestone1:'Jismoniy sensorlarni integratsiya qilish',futureMilestone2:'Ruxsatga asoslangan real joriy etish',futureMilestone3:'Klinik samaradorlikni sinash',pilotBoundary:'Sun’iy dasturiy sinovlar jismoniy sensor samaradorligi, klinik validlik yoki bog‘chada real joriy etish dalili emas.',testLogSlot:'Sun’iy sinov jurnali',pilotProtocolSlot:'Pilot protokoli',
    impactKicker:'Ehtimoliy ijtimoiy ta’sir',impactTitle:'Mahalliy g‘amxo‘rlik ekotizimini <span>kuchaytiradigan texnologiya.</span>',impactIntro:'Ta’sir haqidagi da’volar real pilot dalillariga bog‘liq. Ushbu ko‘rsatkichlar KidNova nimalarni mas’uliyat bilan o‘lchashi mumkinligini ko‘rsatadi.',impact1:'Skrining jarayoni yakunlanishi',measure1:'O‘lchov: yakunlangan nazoratli seanslar',impact2:'Ota-onalar bilan aloqa',measure2:'O‘lchov: yetkazish va ko‘rish darajasi',impact3:'O‘sish yozuvlari uzluksizligi',measure3:'O‘lchov: uzoq muddatli profil to‘liqligi',impact4:'Kuzatuvni muvofiqlashtirish',measure4:'O‘lchov: hujjatlashtirilgan xodim harakatlari',impact5:'Mahalliy bandlik',measure5:'O‘lchov: tayyorlangan va jalb qilingan texniklar',impact6:'Jarayonni raqamlashtirish',measure6:'O‘lchov: vaqt va foydalanish qulayligi natijalari',
    teamKicker:'Jamoa',teamTitle:'Mas’uliyatli innovatsiyaga <span>sodiq insonlar</span> tomonidan yaratiladi.',teamIntro:'Strategiya, tadqiqot, kommunikatsiya va kreativ taqdimotni birlashtirgan KidNova asoschi jamoasi.',teamMember1Role:'Asoschi va CEO',teamMember1Description:'Loyiha strategiyasi, biznes modeli, texnologik rivojlanishni boshqarish, hamkorlik va jamoa koordinatsiyasi.',teamMember2Role:'Mahsulot tadqiqotlari rahbari',teamMember2Description:'Mahsulot tadqiqotlari, ota-onalar va bog‘chalar ehtiyojlarini o‘rganish, foydalanuvchilar fikrini tahlil qilish hamda KidNova mahsulotini rivojlantirishga ko‘maklashish.',teamMember3Role:'Hamjamiyat bilan ishlash rahbari',teamMember3Description:'Ota-onalar, bog‘chalar va keng jamoatchilik bilan aloqalarni yo‘lga qo‘yadi hamda vizual taqdimot, AI video sahnalari va kreativ materiallar orqali KidNova’ni targ‘ib qiladi.',teamLinkedIn:'LinkedIn profili',
    contactKicker:'Hamkorlik va aloqa',contactTitle:'KidNova’ning keyingi bosqichini <span>birga shakllantiring.</span>',contactIntro:'Pilot, tadqiqot, texnik, biznes yoki umumiy hamkorlik masalalari bo‘yicha KidNova jamoasi bilan bevosita bog‘laning.',contactEmailLabel:'Rasmiy aloqa emaili',copyEmail:'Emailni nusxalash',inquiry1:'Pilot bog‘cha hamkorligi',inquiry1Purpose:'Bog‘chalar bilan hamkorlik va kelajakdagi nazorat ostidagi pilot imkoniyatlari.',inquiry1Cta:'Pilot hamkorligini so‘rang',inquiry2:'Universitet tadqiqot hamkorligi',inquiry2Purpose:'Akademik tadqiqotlar, mahsulotni tekshirish va universitetlar bilan hamkorlik.',inquiry2Cta:'Biz bilan tadqiqot olib boring',inquiry3:'Texnik hamkorlik',inquiry3Purpose:'Robototexnika, RFID texnologiyasi, infraqizil sensorlar, dasturiy integratsiya va mahalliy texnik xizmat.',inquiry3Cta:'Texnik hamkor bo‘ling',inquiry4:'Biznes va umumiy so‘rovlar',inquiry4Purpose:'Biznes hamkorliklari, potensial investorlar, kengayish imkoniyatlari va umumiy savollar.',inquiry4Cta:'KidNova jamoasi bilan bog‘laning',
    footerMission:'Har bir kichik kelajak uchun aqlli g‘amxo‘rlik.',developmentStatus:'MVP ishlab chiqish va tekshiruv bosqichi',footerExplore:'Tanishish',footerProject:'Loyiha',footerTrust:'Ishonch',privacyNotice:'Maxfiylikka yo‘naltirilgan konsepsiya',noData:'Haqiqiy salomatlik ma’lumoti yig‘ilmaydi',notDiagnosis:'Tibbiy tashxis emas',rights:'Barcha huquqlar himoyalangan.',footerBridge:'UzHack 2026 · O‘zbekiston–Malayziya texnologik ko‘prigi uchun ishlab chiqilgan'
  };

  uz.botKicker = "MVP 2 · Telegram bot";
  uz.botTitle = "Ota-onalar uchun KidNova — <span>Telegram ichida.</span>";
  uz.botText = "@kidnova_uz_bot — ishlab turgan Python bot. Ota-ona bola profili va salomatlik kundaligini yuritadi, bog‘cha bergan bir martalik kod bilan farzandini ulaydi, KidNova tekshiruv natijalarini ko‘radi, AI yordamchidan so‘raydi va yaqin klinikani topadi.";
  uz.botPill = "Jonli bot · sintetik demo ma’lumot · tibbiy xizmat emas";
  uz.botOpen = "@kidnova_uz_bot ni ochish";
  uz.botScan = "Telefon kamerasi bilan skanerlang";
  uz.botF1 = "Bog‘chaga ulanish";
  uz.botF1Text = "Bog‘cha admini bir martalik kod yaratadi, ota-ona /link KN-XXXXXX yuboradi. Kod 24 soat amal qiladi.";
  uz.botF2 = "KidNova tekshiruvlari";
  uz.botF2Text = "Ulangandan so‘ng bog‘chadagi tekshiruvlar chatda va «Tarix» bo‘limida ko‘rinadi.";
  uz.botF3 = "AI yordamchi";
  uz.botF3Text = "Bola parvarishi bo‘yicha umumiy savollarga o‘zbekcha javob beradi. Shifokor emas, tashxis qo‘ymaydi.";
  uz.botF4 = "Yaqin shifokorni topish";
  uz.botF4Text = "Shifokorni tanlang va lokatsiya yuboring — bot 5 tagacha yaqin klinikani chiqaradi va xaritada yo‘l ko‘rsatadi.";
  uz.botF5 = "Emlashlar";
  uz.botF5Text = "Shifokor belgilagan sanalar va eslatmalar.";
  uz.botF6 = "Profil va salomatlik kundaligi";
  uz.botF6Text = "Bola profili, qo‘lda o‘lchangan harorat va alomatlar, oxirgi yozuvlar bir joyda. Ota-ona barcha ma’lumotini o‘chira oladi.";
  uz.botNote = "Bot shifokor o‘rnini bosmaydi. Klinikalar ma’lumoti OpenStreetMap’dan olingan — shifokor borligini telefon orqali aniqlang.";
  uz.botTryReal = "Haqiqiy botni ochish";
  uz.navBot = "Telegram bot";
  uz.mvp1 = "Python Telegram bot @kidnova_uz_bot";
  uz.nutText = "KidNova Smart Nutrition — bog‘cha oshxona xodimlariga bolalar taomining bir porsiyadagi taxminiy kaloriyasi, oqsil, uglevod, yog‘ va kletchatkasini hisoblash hamda qancha mahsulot olishni rejalashtirishda yordam beradigan ishlaydigan kalkulyator MVP. Kunlik menyuni saqlash keyingi bosqichda rejalashtirilgan.";
  uz.nutStep4 = "Tekshirish va nusxalash";
  uz.nutStep4Text = "Oshxona xodimi ovqat berilishidan oldin rejani tekshiradi va oshxona varag‘ini nusxalaydi. Saqlash rejalashtirilgan.";
  uz.adminDashboard = "Admin panel (MVP)";
  uz.noData = "Sayt demosi faqat sintetik ma’lumot bilan ishlaydi";
  uz.botDataNote = "Telegram bot: ota-ona ma’lumotini istalgan vaqtda o‘chira oladi";
  uz.botF2Text = "Ulangandan so‘ng bog‘chadagi tekshiruvlar botning «Tarix» bo‘limida ko‘rinadi.";
  uz.lblSoftware = "DASTURIY MVP";
  uz.lblActive = "JORIY ISH";
  uz.lblFuture = "KEYINGI BOSQICHLAR";
  uz.lblEvidence = "DALIL KERAK";
  uz.mapFergana = "FARG‘ONA";
  uz.pageTitle = "KidNova — Har bir kichik kelajak uchun aqlli g‘amxo‘rlik";
  uz.pageDesc = "KidNova — bog‘chalar, ota-onalar va mas’ul tibbiy kuzatuv uchun bog‘langan pediatrik skrining ekotizimi. Farg‘onadan boshlanmoqda.";
  baseEn.pageTitle = "KidNova \u2014 Smarter care for every little future"; baseEn.pageDesc = "KidNova \u2014 a connected pediatric screening ecosystem for kindergartens, parents and responsible medical follow-up. Starting in Fergana.";
  baseEn.architectureNote = 'Live MVP backend: Supabase Postgres and Auth. Hosted tests on November 10, 2026 confirmed RLS, role-scoped RPCs, persistent synthetic records, duplicate blocking, and parent isolation. This is demo validation, not a production security certification.';
  uz.architectureNote = 'Jonli MVP backendi: Supabase Postgres va Auth. 2026-yil 10-noyabrda hosted testlar RLS, rolga bog‘langan RPC, sintetik yozuvlarning saqlanishi, dublikat bloklanishi va ota-ona izolyatsiyasini tasdiqladi. Bu demo validatsiyasi, production xavfsizlik sertifikati emas.';

  const workflowCopy = {
    en:[['Child arrives at kindergarten','The daily workflow begins with staff supervision and an age-appropriate experience.'],['Simulated RFID wristband check-in','A simulated RFID wristband identifies the selected fictional child profile.'],['Supported screening','The proposed station performs only supported, non-invasive measurements after validation.'],['Measurements are recorded','Synthetic demo values illustrate how results could enter the correct digital profile.'],['Configured indicators are checked','The software compares values with configured screening indicators without diagnosing disease.'],['Parent receives an update','The existing notification workflow can provide an authorized parent with a clear summary.'],['Personnel coordinate follow-up','Kindergarten personnel review context and arrange appropriate human follow-up when needed.']],
    uz:[['Bola bog‘chaga keladi','Kundalik jarayon xodimlar nazorati va yoshga mos tajriba bilan boshlanadi.'],['Simulyatsiya qilingan RFID bilaguzuk orqali kirish','Simulyatsiya qilingan RFID bilaguzuk tanlangan uydirma bola profilini aniqlaydi.'],['Qo‘llab-quvvatlanadigan skrining','Taklif etilayotgan stansiya tekshiruvdan keyin faqat qo‘llab-quvvatlanadigan noinvaziv o‘lchovlarni bajaradi.'],['O‘lchovlar yozib olinadi','Sun’iy demo qiymatlari natijalar to‘g‘ri raqamli profilga qanday kiritilishini ko‘rsatadi.'],['Sozlangan ko‘rsatkichlar tekshiriladi','Dastur qiymatlarni kasallik tashxisini qo‘ymasdan, sozlangan skrining ko‘rsatkichlari bilan taqqoslaydi.'],['Ota-ona xabar oladi','Mavjud xabar jarayoni vakolatli ota-onaga aniq xulosa yetkazishi mumkin.'],['Xodimlar kuzatuvni muvofiqlashtiradi','Bog‘cha xodimlari kontekstni ko‘rib chiqadi va kerak bo‘lsa tegishli insoniy kuzatuvni tashkil qiladi.']]
  };
  const roadmapCopy = {
    en:[{phase:'STAGE 1 · CURRENT',title:'MVP development & validation',goal:'Goal: Validate software workflows and product feasibility.',items:['Python Telegram bot','Child profile registration','Initial screening history','Parent notifications','Simulated RFID identification development','Pediatrician feedback','Parent survey','Hardware feasibility assessment']},{phase:'STAGE 2 · PLANNED',title:'Kindergarten pilot in Fergana',goal:'Goal: Test KidNova safely in a supervised real-world setting.',items:['Build and test prototype hardware','Integrate and calibrate sensors','Obtain permissions and consent','Collaborate with a pilot kindergarten','Train personnel','Evaluate usability and reliability','Improve from actual evidence']},{phase:'STAGE 3 · PLANNED',title:'Regional expansion',goal:'Goal: Build scalable service infrastructure.',items:['Expand to more kindergartens','Establish local maintenance network','Build institutional partnerships','Improve software and reporting','Develop sustainable commercialization','Explore Fergana Valley and Uzbekistan']}],
    uz:[{phase:'1-BOSQICH · HOZIRGI',title:'MVP ishlab chiqish va tekshiruv',goal:'Maqsad: dasturiy jarayonlar va mahsulot imkoniyatini tekshirish.',items:['Python Telegram bot','Bola profilini ro‘yxatdan o‘tkazish','Dastlabki skrining tarixi','Ota-ona xabarlari','Simulyatsiya qilingan RFID identifikatsiyasi','Pediatr fikri','Ota-onalar so‘rovi','Qurilma imkoniyatini baholash']},{phase:'2-BOSQICH · REJALASHTIRILGAN',title:'Farg‘onadagi bog‘cha piloti',goal:'Maqsad: KidNova’ni nazorat ostidagi real muhitda xavfsiz sinash.',items:['Prototip qurilmani yaratish va sinash','Sensorlarni integratsiya va kalibrlash','Ruxsat va rozilik olish','Pilot bog‘cha bilan hamkorlik','Xodimlarni tayyorlash','Qulaylik va ishonchlilikni baholash','Haqiqiy dalillar asosida yaxshilash']},{phase:'3-BOSQICH · REJALASHTIRILGAN',title:'Hududiy kengayish',goal:'Maqsad: kengayadigan xizmat infratuzilmasini yaratish.',items:['Qo‘shimcha bog‘chalarga kengayish','Mahalliy xizmat tarmog‘ini yaratish','Institutsional hamkorliklar','Dastur va hisobotlarni yaxshilash','Barqaror tijorat modelini ishlab chiqish','Farg‘ona vodiysi va O‘zbekistonni o‘rganish']}]
  };

  const languageStorageKey = 'kidnova-language';
  const isSupportedLanguage = lang => lang === 'uz' || lang === 'en' || lang === 'ru';
  const readStoredLanguage = () => { try { const stored=localStorage.getItem(languageStorageKey); return isSupportedLanguage(stored) ? stored : null; } catch (error) { return null; } };
  const storeLanguage = lang => { try { localStorage.setItem(languageStorageKey,lang); } catch (error) {} };
  let language = 'uz';
  const RU = window.KIDNOVA_RU || { keys: {}, phrases: {} };
  const L = (en, uzText, ru) => language === 'uz' ? uzText : language === 'ru' ? (ru ?? RU.phrases?.[en] ?? en) : en;
  let activeWorkflow = 0;
  let activeRoadmap = 0;
  const t = key => (language === 'uz' ? uz[key] : language === 'ru' ? RU.keys?.[key] : undefined) ?? baseEn[key] ?? key;
  window.KidNova = { t: () => t('pause'), language: () => language };

  const interviewReports = {
    en: [
      {
        title: 'Pediatric Consultation — Research Summary', activity: 'Consultation Conducted', evidence: 'Founder-Documented',
        objective: 'To explore the potential application of KidNova as a preliminary health screening and monitoring support system for preschool children from a pediatric perspective.',
        areas: ['Preliminary non-contact infrared temperature screening.','Staff verification of concerning measurements.','Health monitoring notifications for parents.','Periodic monitoring of children’s growth indicators.','Distinguishing preliminary screening from medical diagnosis.','Protection of children’s personal information.'],
        findings: ['The founder discussed the KidNova concept with a pediatrician and reports receiving initial positive feedback.','The conversation supports developing KidNova as an assistive preliminary screening and notification system rather than an automated medical diagnostic device.','Concerning results should be verified by responsible personnel, with appropriate medical follow-up when necessary.'],
        limitations: 'This founder-documented summary reflects an actual consultation but does not represent independent clinical validation, certified sensor accuracy, medical approval, or a formal clinical study.',
        date: 'Interview date', role: 'Participant role', docs: 'Supporting documents'
      },
      {
        title: 'Kindergarten Staff Interviews — Research Summary', activity: 'Interviews Conducted', evidence: 'Founder-Documented',
        objective: 'To understand daily kindergarten reception procedures and explore how KidNova could fit into existing operational workflows.',
        areas: ['Daily child reception and check-in procedures.','RFID wristband identification and attendance recording.','Preliminary non-contact temperature screening.','Automatic parent notifications.','Reducing repetitive manual recordkeeping.','Designing a simple and accessible staff workflow.'],
        findings: ['The KidNova founder conducted discussions with kindergarten staff and reports receiving positive preliminary feedback.','The discussions explored the potential usefulness of RFID identification, preliminary temperature screening, and parent notifications in daily kindergarten operations.','These features could help organize reception procedures and reduce repetitive manual recording.'],
        limitations: 'The findings reflect preliminary staff feedback. Time savings, efficiency improvements, and real-world operational performance have not yet been quantitatively measured.',
        date: 'Interview date', role: 'Participant role', docs: 'Supporting documents'
      }
    ],
    uz: [
      {
        title: 'Pediatr bilan maslahat — Tadqiqot xulosasi', activity: 'Suhbat o‘tkazilgan', evidence: 'Asoschi tomonidan hujjatlashtirilgan',
        objective: 'KidNova’ning maktabgacha yoshdagi bolalar salomatligini dastlabki kuzatish tizimi sifatida qo‘llanish imkoniyatlarini pediatriya nuqtayi nazaridan o‘rganish.',
        areas: ['Bolalar tana haroratini kontaktsiz infraqizil sensor yordamida dastlabki tekshirish.','Xavotirli ko‘rsatkichlar aniqlanganda mas’ul xodim tomonidan qayta tekshirish.','Ota-onalarga salomatlik kuzatuvi haqida xabarnomalar yuborish.','Bolalarning o‘sish ko‘rsatkichlarini davriy kuzatish.','Tibbiy tashxis va dastlabki skrining o‘rtasidagi farq.','Bola ma’lumotlarining maxfiyligini ta’minlash.'],
        findings: ['Asoschi pediatr bilan KidNova konsepsiyasini muhokama qilgan va dastlabki ijobiy fikr olgan.','Suhbat mazmuniga ko‘ra, KidNova tibbiy tashxis qo‘yadigan qurilma emas, balki dastlabki skrining va ogohlantirish jarayonini qo‘llab-quvvatlaydigan yordamchi tizim sifatida rivojlantirilishi kerak.','Xavotirli natijalarni mas’ul xodim tomonidan qayta tekshirish va tegishli tibbiy yordamga yo‘naltirish muhim.'],
        limitations: 'Ushbu xulosa asoschi tomonidan o‘tkazilgan suhbatga asoslanadi. Klinik validatsiya, sensor aniqligi, tibbiy sertifikatlash yoki mustaqil ilmiy tadqiqot natijasi hisoblanmaydi.',
        date: 'Suhbat sanasi', role: 'Ishtirokchi roli', docs: 'Qo‘shimcha hujjatlar'
      },
      {
        title: 'Bog‘cha xodimlari bilan suhbatlar — Tadqiqot xulosasi', activity: 'Suhbatlar o‘tkazilgan', evidence: 'Asoschi tomonidan hujjatlashtirilgan',
        objective: 'Maktabgacha ta’lim muassasalarining kundalik qabul jarayonini o‘rganish va KidNova tizimining ushbu jarayonga moslashish imkoniyatlarini baholash.',
        areas: ['Bolalarning ertalab bog‘chaga kelish va ro‘yxatdan o‘tish jarayoni.','RFID bilaguzuk orqali identifikatsiya va davomat qaydi.','Kontaktsiz dastlabki harorat tekshiruvi.','Ota-onalarga avtomatik xabarnomalar yuborish.','Takroriy qo‘lda ma’lumot kiritishni kamaytirish.','Xodimlar uchun sodda va tushunarli foydalanish jarayoni.'],
        findings: ['KidNova asoschisi bog‘cha xodimlari bilan suhbatlar o‘tkazgan va dastlabki ijobiy fikrlar olgan.','Suhbatlarda KidNova’ning RFID identifikatsiyasi, dastlabki harorat skriningi va ota-onalarga xabarnoma berish kabi imkoniyatlari kundalik faoliyat uchun foydali bo‘lishi mumkinligi muhokama qilingan.','Ushbu funksiyalar qabul jarayonini tartibga solish va takroriy qo‘lda qayd etishni kamaytirish imkoniyatiga ega.'],
        limitations: 'Mazkur fikrlar dastlabki suhbatlarga asoslangan. Vaqt tejalishi, samaradorlik oshishi yoki real foydalanish natijalari hozircha miqdoriy jihatdan o‘lchanmagan.',
        date: 'Suhbat sanasi', role: 'Ishtirokchi roli', docs: 'Qo‘shimcha hujjatlar'
      }
    ]
  };
  const reportLabels = {
    en: {objective:'Research Objective',areas:'Key Discussion Areas',findings:'Preliminary Findings',limitations:'Limitations',activity:'Activity status',evidence:'Evidence status',empty:'Not provided'},
    uz: {objective:'Tadqiqot maqsadi',areas:'Muhokama qilingan asosiy masalalar',findings:'Dastlabki xulosa',limitations:'Tadqiqot cheklovlari',activity:'Faoliyat holati',evidence:'Dalil holati',empty:'Hozircha taqdim etilmagan'}
  };
  function updateInterviewReports() {
    const lang = language;
    const labels = reportLabels[lang];
    [1,2].forEach((itemIndex, reportIndex) => {
      const details = $$('.evidence-list details')[itemIndex];
      if (!details) return;
      const report = interviewReports[lang][reportIndex];
      const summary = $('summary', details);
      $('b', summary).textContent = report.title;
      $('small', summary).textContent = report.activity;
      const panel = $('.evidence-panel', details);
      panel.innerHTML = `<div class="evidence-tags"><span class="reported">${report.activity}</span><span class="unverified">${report.evidence}</span></div><section class="interview-report"><article><h4>${labels.objective}</h4><p>${report.objective}</p></article><article><h4>${labels.areas}</h4><ol>${report.areas.map(text=>`<li>${text}</li>`).join('')}</ol></article><article><h4>${labels.findings}</h4><ul>${report.findings.map(text=>`<li>${text}</li>`).join('')}</ul></article><article class="report-limitations"><h4>${labels.limitations}</h4><p>${report.limitations}</p></article><div class="evidence-slots interview-fields"><div><span>${report.date}</span><em>${labels.empty}</em></div><div><span>${report.role}</span><em>${labels.empty}</em></div><div><span>${report.docs}</span><em>${labels.empty}</em></div></div></section>`;
    });
  }

  const businessUpgradeCopy = {
    en: {
      title:'Why Choose KidNova?', subtitle:'Smarter kindergarten operations, structured health screening, and better communication with parents.',
      benefits:[
        ['⏱','Operational Efficiency','RFID-based attendance recording and digital temperature records help reduce repetitive administrative work and improve staff efficiency.'],
        ['◎','Structured Health Screening','A non-contact infrared sensor supports preliminary temperature screening. Out-of-range results require further assessment by responsible staff.'],
        ['✈','Parent Communication','Telegram integration enables notifications to parents about their child’s attendance and preliminary screening results.'],
        ['▤','Digital Records','Attendance and screening records can be stored in one system, helping authorized staff review historical data.'],
        ['⚙','Local Technical Support','KidNova plans to develop a neighborhood-based technician network to support robot maintenance and create local employment opportunities.']
      ],
      value:'KidNova aims to reduce repetitive administrative tasks, improve parent communication, and standardize preliminary screening. Actual time savings and economic benefits will be evaluated during pilot testing.',
      compareTitle:'What Changes with KidNova?',compareNote:'Illustrative proposed workflow. Hardware integration and operational outcomes still require development and pilot validation.',columns:['Process','Before KidNova','With KidNova'],rows:[
        ['Attendance','Manual recording','RFID-based automatic recording'],
        ['Temperature records','Manual measurement and recording','Sensor-assisted screening and digital records'],
        ['Parent updates','Phone calls or manual messages','Telegram notifications'],
        ['Record management','Paper records or spreadsheets','Centralized digital history'],
        ['Technical support','Independently arranged','Planned subscription-based support']
      ],
      safeguards:['Temperature screening depends on correct sensor positioning and staff supervision.','KidNova supports staff workflows; it does not replace teachers, nurses, or medical professionals.','Time savings are potential benefits and will be measured during pilot testing; no savings are guaranteed.'],
      careTitle:'KidNova Care — Continuous Support',careDescription:'KidNova Care is a proposed monthly service model for kindergartens, designed to provide software maintenance, technical assistance, and ongoing system support.',
      carePrice:'Proposed price — $59/month',carePer:'per kindergarten robot',careEstimate:'Preliminary business-model estimate; not a confirmed commercial offer.',careIncludes:'Included services',
      services:['Telegram notification support','Software maintenance and updates','Digital record management','Planned backup and data protection services','Remote technical assistance','Scheduled preventive maintenance','Staff onboarding and usage support'],
      careNote:'Core RFID attendance and local temperature-screening functions are intended to remain available on the device. The subscription covers additional services and ongoing support.',
      careBoundary:'Current software MVP: the live Supabase backend, Staff and Parent authentication, RLS-protected data, simulated RFID check-in, temperature screening, review-required scenarios, staff acknowledgement, and Parent screening history have been successfully tested end to end. RFID and temperature inputs are currently simulated; physical sensors and robot hardware will be connected during the next hardware-integration stage.',
      stages:['Existing software MVP','Proposed Care services','Future hardware and support network']
    },
    uz: {
      title:'Nega aynan KidNova?', subtitle:'Bog‘chalarda samarali boshqaruv, tizimli dastlabki sog‘liq skriningi va ota-onalar bilan qulay aloqa.',
      benefits:[
        ['⏱','Xodimlar vaqtini tejash','RFID orqali davomat avtomatik qayd etiladi. Harorat tekshiruvi natijalarini raqamli saqlash esa xodimlarning takroriy ma’muriy ishlarini kamaytirishga yordam beradi.'],
        ['◎','Tizimli sog‘liq skriningi','Kontaktsiz infraqizil sensor bolalarning tana haroratini dastlabki tekshiruvdan o‘tkazishga yordam beradi. Me’yordan tashqari natijalar mas’ul xodim tomonidan qayta tekshirilishi kerak.'],
        ['✈','Ota-onalar bilan tezkor aloqa','Telegram integratsiyasi orqali ota-onalarga farzandining davomat va dastlabki skrining natijalari haqida xabarnomalar yuborish imkoniyati yaratiladi.'],
        ['▤','Raqamli ma’lumotlar tarixi','Davomat va skrining ma’lumotlari yagona tizimda saqlanib, ruxsat etilgan xodimlarga yozuvlarni kuzatish va tahlil qilish imkonini beradi.'],
        ['⚙','Mahalliy texnik xizmat','KidNova kelajakda mikrorayonlar bo‘yicha texnik xizmat ko‘rsatish tarmog‘ini rivojlantirishni rejalashtirmoqda. Bu robotlarga texnik yordam ko‘rsatish va mahalliy ish o‘rinlarini yaratishga xizmat qiladi.']
      ],
      value:'KidNova bog‘chalarning takroriy ma’muriy ishlarini kamaytirish, ota-onalar bilan aloqani yaxshilash va dastlabki skrining jarayonini tizimlashtirishga qaratilgan. Amaliy vaqt tejalishi va iqtisodiy samaradorlik pilot sinovlarida baholanadi.',
      compareTitle:'KidNova bilan nima o‘zgaradi?',compareNote:'Taklif etilayotgan jarayonning namunaviy taqqoslanishi. Qurilma integratsiyasi va amaliy natijalar hali ishlab chiqish hamda pilot sinovlarini talab qiladi.',columns:['Jarayon','KidNova’dan oldin','KidNova bilan'],rows:[
        ['Davomat','Qo‘lda qayd etish','RFID orqali avtomatik qayd etish'],
        ['Harorat yozuvlari','Qo‘lda o‘lchash va qayd etish','Sensor yordamidagi skrining va raqamli yozuvlar'],
        ['Ota-onalarga xabar','Telefon qo‘ng‘iroqlari yoki qo‘lda xabar yuborish','Telegram xabarnomalari'],
        ['Ma’lumotlarni boshqarish','Qog‘oz daftarlar yoki elektron jadvallar','Markazlashtirilgan raqamli tarix'],
        ['Texnik yordam','Mustaqil ravishda tashkil etiladi','Obuna doirasida ko‘rsatilishi rejalashtirilgan yordam']
      ],
      safeguards:['Harorat skriningi sensorni to‘g‘ri joylashtirish va xodim nazoratini talab qiladi.','KidNova xodimlar ish jarayonini qo‘llab-quvvatlaydi; tarbiyachi, hamshira yoki tibbiyot mutaxassisining o‘rnini bosmaydi.','Vaqt tejalishi ehtimoliy foyda bo‘lib, pilot sinovlarida o‘lchanadi; tejamkorlik kafolatlanmaydi.'],
      careTitle:'KidNova Care — doimiy qo‘llab-quvvatlash',careDescription:'KidNova Care — bog‘chalar uchun taklif etilayotgan oylik xizmat modeli. U dasturiy ta’minot, texnik yordam va tizimning barqaror ishlashini qo‘llab-quvvatlashga qaratilgan.',
      carePrice:'Taklif etilayotgan narx — $59/oy',carePer:'har bir bog‘cha roboti uchun',careEstimate:'Dastlabki biznes-model bahosi; tasdiqlangan tijoriy taklif emas.',careIncludes:'Xizmatlar tarkibi',
      services:['Telegram xabarnomalarini qo‘llab-quvvatlash','Dasturiy ta’minotga xizmat ko‘rsatish va yangilash','Raqamli yozuvlarni boshqarish','Rejalashtirilgan zaxira nusxa va ma’lumotlarni himoya qilish xizmatlari','Masofaviy texnik yordam','Reja asosida profilaktik texnik xizmat','Xodimlarni tanishtirish va foydalanish bo‘yicha yordam'],
      careNote:'Asosiy RFID davomat va mahalliy harorat skriningi funksiyalari robotning o‘zida ishlashi rejalashtirilgan. Oylik obuna qo‘shimcha xizmatlar va doimiy qo‘llab-quvvatlash uchun mo‘ljallangan.',
      careBoundary:'Joriy software MVP: live Supabase backend, Staff va Parent autentifikatsiyasi, RLS orqali himoyalangan ma’lumotlar, RFID check-in simulyatsiyasi, harorat skriningi, review-required holatlari, staff acknowledgement va Parent screening history muvaffaqiyatli end-to-end testdan o‘tkazilgan. RFID va harorat inputlari hozircha simulyatsiya qilingan; fizik sensorlar va robot apparati keyingi hardware integration bosqichida ulanadi.',
      stages:['Mavjud dasturiy MVP','Taklif etilayotgan Care xizmatlari','Kelajakdagi qurilma va yordam tarmog‘i']
    }
  };
  function renderBusinessUpgrade() {
    const lang = language;
    const c = businessUpgradeCopy[lang];
    let section = $('#business-value');
    if (!section) {
      section = document.createElement('section');
      section.id = 'business-value';
      section.className = 'section business-value-section';
      const business = $('#business');
      business.after(section);
      const care = document.createElement('div');
      care.id = 'care-plan';
      care.className = 'care-plan';
      $('.container', business).append(care);
    }
    section.innerHTML = `<div class="container"><div class="section-heading centered"><div class="kicker">KidNova</div><h2>${c.title}</h2><p>${c.subtitle}</p></div><div class="benefit-cards">${c.benefits.map(([icon,title,text])=>`<article class="benefit-card"><span class="benefit-icon" aria-hidden="true">${icon}</span><h3>${title}</h3><p>${text}</p></article>`).join('')}</div><p class="business-value-statement">${c.value}</p><details class="value-details"><summary class="collapse-summary">${c.compareTitle}</summary><div class="section-heading comparison-heading"><h2>${c.compareTitle}</h2><p class="comparison-context">${c.compareNote}</p></div><div class="value-comparison"><table><thead><tr>${c.columns.map(x=>`<th scope="col">${x}</th>`).join('')}</tr></thead><tbody>${c.rows.map(row=>`<tr>${row.map((x,i)=>i===0?`<th scope="row">${x}</th>`:`<td data-label="${c.columns[i]}">${x}</td>`).join('')}</tr>`).join('')}</tbody></table></div><ul class="value-safeguards">${c.safeguards.map(x=>`<li>${x}</li>`).join('')}</ul></details></div>`;
    const care = $('#care-plan');
    care.innerHTML = `<div class="care-plan-copy"><span class="care-kicker">${c.stages[1]}</span><h3>${c.careTitle}</h3><p>${c.careDescription}</p><div class="care-price"><strong>${c.carePrice}</strong><span>${c.carePer}</span></div><small class="care-estimate">${c.careEstimate}</small><div class="care-status"><span>Live MVP: Supabase • Auth • RLS • RFID Simulation • Temperature Screening</span><span>${c.stages[2]}: ${lang==='en'?'planned':'rejalashtirilgan'}</span></div></div><div class="care-plan-services"><h4>${c.careIncludes}</h4><ul>${c.services.map(x=>`<li>${x}</li>`).join('')}</ul></div><p class="care-note">${c.careNote}</p><p class="care-boundary">${c.careBoundary}</p>`;
  }

  function setLanguage(lang,persist=false) {
    workflowCopy.ru ??= RU.workflow || workflowCopy.en; roadmapCopy.ru ??= RU.roadmap || roadmapCopy.en; interviewReports.ru ??= RU.interviews || interviewReports.en; reportLabels.ru ??= RU.reportLabels || reportLabels.en; businessUpgradeCopy.ru ??= RU.business || businessUpgradeCopy.en;
    language = isSupportedLanguage(lang) ? lang : 'uz';
    document.documentElement.lang = language;
    document.title = t('pageTitle'); document.querySelector('meta[name="description"]')?.setAttribute('content', t('pageDesc'));
    $$('[data-i18n]').forEach(el => { const key=el.dataset.i18n; el.textContent = t(key); });
    $$('[data-i18n-html]').forEach(el => { const key=el.dataset.i18nHtml; el.innerHTML = t(key); });
    const toggle = $('#languageToggle');
    $$('span',toggle).forEach(span=>span.classList.toggle('active',span.dataset.lang===language));
    toggle.dataset.langIndex=String(['en','uz','ru'].indexOf(language));
    toggle.setAttribute('aria-label',L('Language: English. Click to switch','Til: o‘zbekcha. Almashtirish uchun bosing','Язык: русский. Нажмите, чтобы сменить'));
    $('#menuToggle').setAttribute('aria-label',L('Open menu','Menyuni ochish'));
    $('#robot3d').setAttribute('aria-label',L('Interactive 3D KidNova robot. Drag or use arrow keys to rotate.','Interaktiv 3D KidNova roboti. Aylantirish uchun suring yoki strelka tugmalaridan foydalaning.'));
    if(persist)storeLanguage(language);
    updateWorkflow(activeWorkflow); updateRoadmap(activeRoadmap); updateDemoCopy();
    updateInterviewReports();
    renderBusinessUpgrade();
    document.dispatchEvent(new CustomEvent('kidnova:language',{detail:{language}}));
  }
  $('#languageToggle').addEventListener('click',e=>{const picked=e.target.closest('[data-lang]')?.dataset.lang;const order=['uz','ru','en'];setLanguage(picked||order[(order.indexOf(language)+1)%3],true)});

  const menuToggle=$('#menuToggle'), mobileMenu=$('#mobileMenu');
  menuToggle.addEventListener('click',()=>{const open=menuToggle.getAttribute('aria-expanded')==='true';menuToggle.setAttribute('aria-expanded',String(!open));menuToggle.setAttribute('aria-label',!open?(L('Close menu','Menyuni yopish')):(L('Open menu','Menyuni ochish')));mobileMenu.hidden=open;document.body.classList.toggle('menu-open',!open)});
  $$('a',mobileMenu).forEach(a=>a.addEventListener('click',()=>{menuToggle.setAttribute('aria-expanded','false');mobileMenu.hidden=true;document.body.classList.remove('menu-open')}));
  addEventListener('scroll',()=>$('.site-header').classList.toggle('scrolled',scrollY>16),{passive:true});

  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(reduced){$$('.reveal').forEach(el=>el.classList.add('visible'))}else{const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('visible');observer.unobserve(entry.target)}}),{threshold:.1});$$('.reveal').forEach(el=>observer.observe(el))}

  function updateWorkflow(index){activeWorkflow=index;$$('.workflow-step').forEach((b,i)=>b.classList.toggle('active',i===index));const copy=workflowCopy[language][index];$('#workflowNumber').textContent=String(index+1).padStart(2,'0')+' / 07';$('#workflowDetailTitle').textContent=copy[0];$('#workflowDetailText').textContent=copy[1];$('#workflowProgress').style.width=((index+1)/7*100)+'%'}
  $$('.workflow-step').forEach((button,i)=>button.addEventListener('click',()=>updateWorkflow(i)));
  function updateRoadmap(index){activeRoadmap=index;$$('[data-roadmap]').forEach((b,i)=>b.classList.toggle('active',i===index));const item=roadmapCopy[language][index];$('#roadmapPhase').textContent=item.phase;$('#roadmapHeading').textContent=item.title;$('#roadmapGoal').textContent=item.goal;$('#roadmapList').innerHTML=item.items.map(x=>`<li>${x}</li>`).join('')}
  $$('[data-roadmap]').forEach((button,i)=>button.addEventListener('click',()=>updateRoadmap(i)));updateRoadmap(0);

  let selectedChild='a', scenario='routine', demoStage=0, rfidTimer, screeningTimer;
  const demoData={a:{name:{en:'Demo Child A',uz:'Demo bola A',ru:'Демо-ребёнок A'},height:'104',weight:'17.2'},b:{name:{en:'Demo Child B',uz:'Demo bola B',ru:'Демо-ребёнок B'},height:'111',weight:'19.0'},c:{name:{en:'Demo Child C',uz:'Demo bola C',ru:'Демо-ребёнок C'},height:'97',weight:'15.1'},d:{name:{en:'Demo Child D',uz:'Demo bola D',ru:'Демо-ребёнок D'},height:'117',weight:'21.4'},e:{name:{en:'Demo Child E',uz:'Demo bola E',ru:'Демо-ребёнок E'},height:'101',weight:'16.3'},f:{name:{en:'Demo Child F',uz:'Demo bola F',ru:'Демо-ребёнок F'},height:'109',weight:'18.6'}};
  window.kidnovaDemoData=demoData;
  $$('.child-card').forEach(card=>card.addEventListener('click',()=>{selectedChild=card.dataset.child;$$('.child-card').forEach(c=>c.classList.toggle('selected',c===card))}));
  $$('input[name="scenario"]').forEach(input=>input.addEventListener('change',()=>scenario=input.value));
  function goToDemo(stage){clearTimeout(rfidTimer);clearInterval(screeningTimer);demoStage=stage;$$('.demo-screen').forEach(s=>s.classList.toggle('active',Number(s.dataset.screen)===stage));$$('.demo-nav li').forEach((li,i)=>{li.classList.toggle('active',i===stage);li.classList.toggle('complete',i<stage)});if(stage===1){const btn=$('.delayed');btn.disabled=true;rfidTimer=setTimeout(()=>{btn.disabled=false;$('.rfid-status b').textContent=L('Simulated RFID wristband identified','RFID bilaguzuk simulyatsiyasi aniqlandi');$('.rfid-status .spinner').style.display='none'},1300)}if(stage===2)runScreening();if(stage===3)renderResults();if(stage===4)renderMessage()}
  window.kidnovaGoToDemo = goToDemo;
  $$('.demo-next').forEach(button=>button.addEventListener('click',()=>goToDemo(Number(button.dataset.next))));
  function runScreening(){let value=0;const circle=$('.progress-circle');circle.style.strokeDashoffset='377';$('#screenPercent').textContent='0%';$$('.measurement-list [data-state]').forEach(el=>el.textContent=L('Waiting','Kutilmoqda'));screeningTimer=setInterval(()=>{value+=4;$('#screenPercent').textContent=value+'%';circle.style.strokeDashoffset=String(377*(1-value/100));if(value>=35)$('[data-state="temp"]').textContent=L('Complete','Tayyor');if(value>=65)$('[data-state="height"]').textContent=L('Complete','Tayyor');if(value>=90)$('[data-state="weight"]').textContent=L('Complete','Tayyor');if(value>=100){clearInterval(screeningTimer);setTimeout(()=>goToDemo(3),350)}},70)}
  function renderResults(){const data=demoData[selectedChild],attention=scenario==='attention',temp=attention?'38.4':'36.6';$('#resultTemp').textContent=temp+'°C';$('#resultHeight').textContent=data.height+' cm';$('#resultWeight').textContent=data.weight+' kg';$('#resultSummary').textContent=attention?(L('Synthetic review indicator triggered. This is not a diagnosis.','Sintetik kuzatuv belgisi ishga tushdi. Bu tashxis emas.')):(L('No configured alert triggered.','Sozlangan ogohlantirish ishga tushmadi.'));const flag=$('#tempFlag');flag.textContent=attention?(L('Staff review required · not a diagnosis','Xodim tekshiruvi kerak · tashxis emas')):t('withinDemo');flag.className=attention?'warn':'ok';const note=$('#resultNote');note.classList.toggle('warn',attention);$('span',note).textContent=attention?'!':'✓';$('b',note).textContent=attention?(L('Staff review required','Xodim tekshiruvi kerak')):t('reviewComplete');$('p',note).textContent=attention?(L('This synthetic value triggers a demo staff-review flag only. It is not a medical diagnosis.','Bu sintetik qiymat faqat demo xodim tekshiruvi belgisini ishga tushiradi. Bu tibbiy tashxis emas.')):t('routineNote')}
  function renderMessage(){const data=demoData[selectedChild],attention=scenario==='attention',temp=attention?'38.4':'36.6',name=data.name[language];$('#messageTitle').textContent=attention?(L('Screening requires staff review','Skrining xodim tekshiruvini talab qiladi')):(L('Screening summary','Skrining xulosasi'));$('#messageBody').textContent=attention?(L(`${name}'s synthetic screening triggered a staff-review flag. This is not a medical diagnosis.`,`${name}ning sintetik skriningi xodim tekshiruvi belgisini ishga tushirdi. Bu tibbiy tashxis emas.`, `Синтетический скрининг (${name}) включил флажок проверки персоналом. Это не медицинский диагноз.`)):(L(`${name}'s simulated screening is complete. No configured alert was triggered.`,`${name} uchun simulyatsiya skriningi tugadi. Sozlangan ogohlantirish ishga tushmadi.`, `Симулированный скрининг (${name}) завершён. Настроенные оповещения не сработали.`));$('#msgTemp').textContent=temp;$('#msgHeight').textContent=data.height;$('#msgWeight').textContent=data.weight}
  function restartDemo(){clearTimeout(rfidTimer);clearInterval(screeningTimer);selectedChild='a';scenario='routine';$$('.child-card').forEach(c=>c.classList.toggle('selected',c.dataset.child==='a'));$('input[value="routine"]').checked=true;$('.rfid-status .spinner').style.display='block';goToDemo(0)}
  $('#restartDemo').addEventListener('click',restartDemo);$('#demoAgain').addEventListener('click',restartDemo);
  function updateDemoCopy(){if(demoStage===1&&$('.rfid-status .spinner').style.display==='none')$('.rfid-status b').textContent=L('Simulated RFID wristband identified','RFID bilaguzuk simulyatsiyasi aniqlandi');if(demoStage===2){const progress=parseInt($('#screenPercent').textContent,10)||0,thresholds={temp:35,height:65,weight:90};$$('.measurement-list [data-state]').forEach(el=>{const key=el.dataset.state;el.textContent=progress>=(thresholds[key]||101)?(L('Complete','Tayyor')):(L('Waiting','Kutilmoqda'))})}if(demoStage===3)renderResults();if(demoStage===4)renderMessage()}
  $$('a[aria-disabled="true"]').forEach(a=>a.addEventListener('click',e=>e.preventDefault()));
  const copyEmailButton=$('#copyEmailButton'),copyEmailStatus=$('#copyEmailStatus'),contactEmail='kidnova.uz@gmail.com';
  if(copyEmailButton&&copyEmailStatus){
    let copyFeedbackTimer;
    const clearCopyFeedback=()=>{clearTimeout(copyFeedbackTimer);copyEmailStatus.textContent='';copyEmailButton.classList.remove('copied')};
    copyEmailButton.addEventListener('click',async()=>{
      let copied=false;
      if(navigator.clipboard&&window.isSecureContext){try{await navigator.clipboard.writeText(contactEmail);copied=true}catch(error){copied=false}}
      if(!copied){const field=document.createElement('textarea');field.value=contactEmail;field.setAttribute('readonly','');field.style.cssText='position:fixed;left:-9999px;top:0;opacity:0';document.body.append(field);field.select();try{copied=document.execCommand('copy')}catch(error){copied=false}field.remove()}
      copyEmailStatus.textContent=copied?(L('Email copied','Email nusxalandi')):(L('Copy failed — select the email address','Nusxalash amalga oshmadi — email manzilini tanlang'));
      copyEmailButton.classList.toggle('copied',copied);
      clearTimeout(copyFeedbackTimer);copyFeedbackTimer=setTimeout(clearCopyFeedback,4000);
    });
    document.addEventListener('kidnova:language',clearCopyFeedback);
  }
  try{setLanguage(readStoredLanguage()||'uz');updateWorkflow(0)}finally{document.documentElement.classList.remove('i18n-pending')}
})();

// Demo upgrade: auto-play with a cursor, live measurements, history trend, RFID lock-on, auto-advance
(()=>{
  const app=document.querySelector('.demo-app');if(!app)return;
  const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
  const uz=()=>document.documentElement.lang==='uz';
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const isActive=n=>$(`.demo-screen[data-screen="${n}"]`).classList.contains('active');
  const attention=()=>$('input[name="scenario"]:checked').value==='attention';
  const child=()=>$('.child-card.selected').dataset.child;
  const T={take:['Auto demo · click anywhere to take control','Avto demo · boshqarish uchun bosing'],replay:['Replay demo','Qayta ko‘rish'],trend:['Temperature history · last 6 visits','Harorat tarixi · oxirgi 6 tashrif'],sample:['Sample data · not saved','Namuna ma’lumot · saqlanmagan'],live:['Saved in Supabase','Supabase’da saqlangan']};
  const tx=k=>window.kidnovaT(T[k][0],T[k][1]);
  let running=false,aborted=false,played=false;

  // current step name in the top bar, so the sidebar can stay a slim rail
  const topbar=$('.demo-topbar'),step=document.createElement('b');step.className='demo-step';topbar.firstElementChild.after(step);
  const pill=document.createElement('button');pill.type='button';pill.className='auto-pill';pill.hidden=true;$('#restartDemo').before(pill);
  const syncStep=()=>{const li=$('.demo-nav li.active b');step.textContent=li?li.textContent:''};

  // Simulated RFID: lock on, then auto-advance
  const rfidStage=$('.rfid-stage'),cont=$('.delayed');
  new MutationObserver(()=>{
    if(cont.disabled){rfidStage.classList.remove('done');return}
    if(isActive(1)){rfidStage.classList.add('done');setTimeout(()=>{if(isActive(1)&&!cont.disabled)cont.click()},900)}
  }).observe(cont,{attributes:true,attributeFilter:['disabled']});

  // screening: each value lands as its measurement completes
  const tiles=$$('.measurement-list > span');
  tiles.forEach(t=>{const e=document.createElement('u');e.className='live';t.append(e)});
  let liveTimer;
  function startLive(){
    const a=attention(),d=child()==='a'?['104','17.2']:['111','19.0'];
    const vals=[(a?'38.4':'36.6')+'°C',d[0]+' cm',d[1]+' kg'],at=[35,65,90],from=[0,35,65];
    tiles.forEach(t=>{t.classList.remove('on');t.style.setProperty('--p',0);$('.live',t).textContent='—'});
    clearInterval(liveTimer);
    liveTimer=setInterval(()=>{
      const pct=parseInt($('#screenPercent').textContent)||0;
      tiles.forEach((t,i)=>{
        t.style.setProperty('--p',Math.max(0,Math.min(1,(pct-from[i])/(at[i]-from[i]))));
        if(pct>=at[i]&&!t.classList.contains('on')){t.classList.add('on');$('.live',t).textContent=vals[i]}
      });
      if(pct>=100||!isActive(2))clearInterval(liveTimer);
    },60);
  }

  // results: temperature trend + alert styling
  const grid=$('.result-grid'),trend=document.createElement('div');trend.className='result-trend';grid.after(trend);
  function renderTrend(){
    const livePts=typeof window.kidnovaLiveHistory==='function'?window.kidnovaLiveHistory(child()):null;
    const a=livePts?livePts[livePts.length-1]>=37.5:attention(),pts=livePts||[36.5,36.6,36.4,36.6,36.5,a?38.4:36.6],lo=Math.min(36.2,...pts)-.1,hi=Math.max(38.5,...pts)+.1,W=Math.max(300,Math.round(trend.clientWidth-40)),H=76,n=pts.length;
    const xy=pts.map((v,i)=>[n===1?W/2:10+i*(W-20)/(n-1),H-8-((v-lo)/(hi-lo))*(H-20)]);
    const line=xy.map((p,i)=>(i?'L':'M')+p[0].toFixed(1)+' '+p[1].toFixed(1)).join(' ');
    const last=xy[n-1],col=a?'#e49c36':'#16a47a',base=(H-8-((37.5-lo)/(hi-lo))*(H-20)).toFixed(1);
    trend.innerHTML=`<div class="trend-head"><b>${livePts?(window.kidnovaT(`Temperature history · ${n} saved visit${n>1?'s':''}`,`Harorat tarixi · ${n} ta saqlangan tashrif`,`История температуры · сохранённых визитов: ${n}`)):tx('trend')}</b><small class="trend-source">${livePts?tx('live'):tx('sample')}</small><span class="${a?'warn':'ok'}">${pts[n-1].toFixed(1)}°C</span></div><svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" aria-hidden="true"><line x1="0" x2="${W}" y1="${base}" y2="${base}" stroke="#d9e5ec" stroke-dasharray="3 4"/><path d="${line}" fill="none" stroke="#9db8ca" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round" pathLength="1" class="trend-line"/><circle cx="${last[0]}" cy="${last[1]}" r="6" fill="${col}" class="trend-dot"/></svg>`;
    $$('.result-grid article')[0].classList.toggle('alert',a);
  }

  // follow the app's own screen changes
  $$('.demo-screen').forEach(s=>new MutationObserver(()=>{
    if(!s.classList.contains('active'))return;
    const n=+s.dataset.screen;syncStep();
    if(n===2)startLive();
    if(n===3)requestAnimationFrame(renderTrend);
    if(n===4)$('.message').classList.toggle('alert',attention());
  }).observe(s,{attributes:true,attributeFilter:['class']}));
  document.addEventListener('kidnova:language',()=>{syncStep();if(isActive(3))renderTrend();if(!pill.hidden)pill.textContent=running?tx('take'):'↺ '+tx('replay')});
  syncStep();

  // auto-play with a cursor
  const cursor=document.createElement('div');cursor.className='demo-cursor';cursor.hidden=true;cursor.innerHTML='<svg viewBox="0 0 24 24" width="26" height="26"><path d="M4 2l15 9-6.5 1.6L9 19z" fill="#10243a" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>';app.append(cursor);
  const wait=async ms=>{await sleep(ms);if(aborted)throw 0};
  const waitFor=async(f,max=15000)=>{const t=Date.now();while(!f()){if(Date.now()-t>max)throw 0;await wait(100)}};
  async function moveTo(el,dx=.5,dy=.5){const a=app.getBoundingClientRect(),r=el.getBoundingClientRect();cursor.style.transform=`translate(${r.left-a.left+r.width*dx}px,${r.top-a.top+r.height*dy}px)`;await wait(850)}
  async function press(el){cursor.classList.add('press');await wait(160);el.click();await wait(220);cursor.classList.remove('press')}
  function end(){running=false;cursor.hidden=true;cursor.classList.remove('press');pill.textContent='↺ '+tx('replay');pill.hidden=false;pill.classList.add('replay')}
  async function play(){
    if(running)return;if($('.demo-main').dataset.authenticated==='true'){pill.hidden=true;return}running=true;aborted=false;played=true;
    $('#restartDemo').click();pill.hidden=false;pill.classList.remove('replay');pill.textContent=tx('take');
    const a=app.getBoundingClientRect();cursor.hidden=false;cursor.style.transition='none';cursor.style.transform=`translate(${a.width*.7}px,${a.height*.8}px)`;cursor.offsetWidth;cursor.style.transition='';
    try{
      await wait(900);
      const b=$('.child-card[data-child="b"]');await moveTo(b);await press(b);
      const att=$('input[value="attention"]');await moveTo(att.closest('label'));await press(att);
      const go=$('.demo-screen[data-screen="0"] .demo-next');await waitFor(()=>!go.disabled,30000);await moveTo(go);await press(go);
      await waitFor(()=>isActive(3),30000);await wait(500);
      cursor.style.transform=`translate(${app.clientWidth*.55}px,${app.clientHeight*.6}px)`;await wait(3600);
      const nx=$('.demo-screen[data-screen="3"] .demo-next');await moveTo(nx);await press(nx);
      await waitFor(()=>isActive(4));await wait(600);
      end();
    }catch(e){if(!aborted)end()}
  }
  // any real interaction hands control to the visitor
  const take=e=>{if(!running||!e.isTrusted)return;aborted=true;running=false;cursor.hidden=true;pill.hidden=true};
  app.addEventListener('pointerdown',take,true);app.addEventListener('keydown',take,true);
  pill.addEventListener('click',()=>{if(pill.classList.contains('replay'))play()});
  new MutationObserver(()=>{const live=$('.demo-main').dataset.authenticated==='true';if(live){if(running){aborted=true;running=false;cursor.hidden=true}pill.hidden=true}else if(played&&!running){pill.hidden=false;pill.classList.add('replay');pill.textContent='↺ '+tx('replay')}}).observe($('.demo-main'),{attributes:true,attributeFilter:['data-authenticated']});
  if(!reduced)new IntersectionObserver((es,io)=>{if(es[0].isIntersecting&&!played){io.disconnect();setTimeout(play,500)}},{threshold:.6}).observe(app);
  else{pill.hidden=false;pill.classList.add('replay');pill.textContent='▶ '+tx('replay')}
})();

// Scroll motion: progress bar, staggered card entrances, headline underline sweep, hero parallax, robot turn
(()=>{
  if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  const $$=(s,r=document)=>[...r.querySelectorAll(s)];
  document.documentElement.classList.add('motion');

  // progress bar
  const bar=document.createElement('div');bar.className='scroll-progress';document.body.append(bar);

  // staggered entrances: cards enter one after another, then hand their styles back
  const sel='section:not(#home):not(#demo) :is(article,[class*="-card"],.card)';
  const cards=$$(sel).filter(el=>!el.parentElement.closest(sel)&&!el.classList.contains('reveal'));
  const groups=new Map();
  cards.forEach(el=>{const p=el.parentElement;const i=groups.get(p)||0;groups.set(p,i+1);el.style.setProperty('--d',Math.min(i,6)*90+'ms');el.classList.add('sr')});
  const io=new IntersectionObserver(es=>es.forEach(e=>{
    if(!e.isIntersecting)return;io.unobserve(e.target);
    e.target.classList.add('sr-in');
    setTimeout(()=>e.target.classList.remove('sr','sr-in'),1100+parseInt(e.target.style.getPropertyValue('--d')));
  }),{threshold:.12,rootMargin:'0px 0px -6% 0px'});
  cards.forEach(el=>io.observe(el));

  // headline accent underline sweeps in when the heading is seen
  const heads=$$('.section-heading h2 span,.impact-intro h2 span,.demo-intro h2 span');
  const hio=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('swept');hio.unobserve(e.target)}}),{threshold:.6});
  heads.forEach(h=>hio.observe(h));

  // scroll-linked: progress, parallax, robot turn
  const orbs=$$('.hero-orb'),stage=$('.robot-stage');
  function $(s){return document.querySelector(s)}
  let ticking=false;
  function update(){
    ticking=false;
    const y=scrollY,max=document.documentElement.scrollHeight-innerHeight;
    bar.style.transform=`scaleX(${max>0?y/max:0})`;
    if(y<1400){
      orbs.forEach((o,i)=>o.style.transform=`translate3d(0,${y*(i?-.12:.18)}px,0)`);
      if(stage)stage.style.transform=`translate3d(0,${y*.06}px,0)`;
    }
    window.__kidnovaScrollYaw=y*.0011;
  }
  addEventListener('scroll',()=>{if(!ticking){ticking=true;requestAnimationFrame(update)}},{passive:true});
  update();
})();
