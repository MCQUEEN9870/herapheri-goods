// Simple dynamic SEO helper for client-side pages
// Parses URL params and updates <title>, meta description, OG/Twitter tags, and optional JSON-LD

(function(){
  try {
    var params = new URLSearchParams(window.location.search || '');
    var rawQuery = (params.get('q') || '').trim();
    var city = (params.get('city') || '').trim();
    var type = (params.get('type') || '').trim();
    var intent = (params.get('intent') || '').trim();
    var landing = (params.get('landing') || '').trim(); // values: home | vehicles | register

    // Normalize helpers
    function toTitle(str){ return str ? str.replace(/\b\w/g, function(m){ return m.toUpperCase(); }) : str; }
    function capitalize(str){ if(!str) return str; return str.charAt(0).toUpperCase() + str.slice(1); }

    // Known vehicle keywords mapping for better normalization
    var vehicleAliases = {
      'maxx': 'Bolero Pickup (MaXX)',
      'bolero': 'Bolero Pickup (MaXX)',
      'bolero pickup': 'Bolero Pickup (MaXX)',
      'tata ace': 'Tata Ace (Chhota Hathi)',
      'chhota hathi': 'Tata Ace (Chhota Hathi)',
      'vikram tempo': 'Vikram Tempo',
      'mini truck': 'Mini Truck (Eicher Canter)',
      'container truck': 'Container Truck',
      'open body truck': 'Open Body Truck (6 wheeler)',
      'closed body truck': 'Closed Body Truck',
      'flatbed truck': 'Flatbed Truck',
      'e-rickshaw': 'E-Rickshaw Loader (Tuk-Tuk)',
      'jcb': 'JCB',
      'crane': 'Crane',
      'tanker': 'Tanker Truck',
      'garbage truck': 'Garbage Truck',
      'tow-truck': 'Tow-Truck',
      'packers': 'Packer&Movers',
      'movers': 'Packer&Movers',
      'parcel': 'Parcel Delivery',
      'food truck': 'Food trucks',
      'drink truck': 'Drink trucks',
      'truck': 'Trucks',
      'trucks': 'Trucks'
    };

    function normalizeType(t){
      if(!t) return '';
      var key = t.toLowerCase().trim();
      if(vehicleAliases[key]) return vehicleAliases[key];
      // Try partial matches
      for(var k in vehicleAliases){ if(key.indexOf(k) >= 0) return vehicleAliases[k]; }
      return toTitle(t);
    }

    // If q present, attempt to derive city/type/intent
    if(rawQuery){
      var q = rawQuery.toLowerCase();
      if(!city){
        // Support English and Hindi "in" equivalents: in, me, mein, mai, में, मे
        var inMatch = q.match(/\b(in|me|mein|mai|में|मे)\s+([a-zA-Z\u0900-\u097F\s]+)$/);
        if(inMatch) city = toTitle(inMatch[2].trim());
      }
      if(!type){
        for(var alias in vehicleAliases){ if(q.indexOf(alias) >= 0) { type = vehicleAliases[alias]; break; } }
      }
      if(!intent){
        if(/register|signup|kaise\s+register|register\s+kaise|vehicle\s+register|truck\s+register|gaadi\s+register|गाड़ी\s*रजिस्टर|ट्रक\s*रजिस्टर/.test(q)) intent = 'register';
        else if(/truck|trucks|tempo|jcb|crane|pickup|delivery|maxx|tata ace|vehicle/.test(q)) intent = 'find';
      }
    }

    type = normalizeType(type);
    city = toTitle(city);

    // If still no city, try to infer from trailing token against known cities
    if(!city && rawQuery){
      var knownCities = [
        // North India
        "Delhi","New Delhi","Jammu","Udhampur","Katra","Shimla","Manali","Solan",
        "Amritsar","Ludhiana","Jalandhar","Patiala","Bathinda",
        "Chandigarh","Panchkula","Mohali",
        "Panipat","Sonipat","Rohtak","Karnal","Ambala","Hisar","Sirsa","Rewari","Kurukshetra",
        "Jaipur","Jodhpur","Udaipur","Ajmer","Bikaner","Kota","Alwar","Bharatpur","Sikar","Tonk",
        "Lucknow","Kanpur","Varanasi","Allahabad","Prayagraj","Gorakhpur","Ayodhya","Faizabad",
        "Bareilly","Moradabad","Meerut","Saharanpur","Muzaffarnagar","Bulandshahr","Mathura",
        "Agra","Aligarh","Sitapur","Ballia","Mau","Firozabad","Hathras",
      
        // West India
        "Mumbai","Navi Mumbai","Thane","Kalyan","Vasai","Pune","Nagpur","Nashik",
        "Aurangabad","Kolhapur","Sangli","Satara","Jalgaon","Dhule","Ahmednagar",
        "Latur","Beed","Osmanabad","Akola","Amravati","Chandrapur","Wardha","Yavatmal","Solapur",
        "Ahmedabad","Surat","Vadodara","Rajkot","Gandhinagar","Jamnagar","Bhavnagar",
        "Junagadh","Porbandar","Morbi","Mehsana","Anand","Nadiad","Palanpur",
        "Margao","Panaji","Vasco da Gama",
      
        // South India
        "Bengaluru","Bangalore","Mysuru","Mangalore","Udupi","Hubli","Dharwad",
        "Belgaum","Davanagere","Bellary","Tumkur",
        "Hyderabad","Secunderabad","Warangal","Nizamabad","Karimnagar","Khammam",
        "Vijayawada","Visakhapatnam","Nellore","Tirupati","Guntur","Kurnool","Anantapur",
        "Kadapa","Ongole","Vizianagaram",
        "Chennai","Coimbatore","Madurai","Salem","Erode","Tiruppur","Thanjavur","Tirunelveli",
        "Tuticorin","Vellore","Kanchipuram","Cuddalore",
        "Kozhikode","Thrissur","Kollam","Alappuzha","Palakkad","Malappuram","Kannur","Kasaragod",
      
        // East India
        "Kolkata","Howrah","Durgapur","Asansol","Siliguri","Malda","Jalpaiguri","Darjeeling","Kharagpur",
        "Patna","Muzaffarpur","Gaya","Darbhanga","Bhagalpur","Purnia","Katihar","Samastipur","Chhapra","Siwan",
        "Ranchi","Jamshedpur","Bokaro","Hazaribagh","Dhanbad","Daltonganj",
        "Bhubaneswar","Cuttack","Rourkela","Sambalpur","Puri","Balasore","Berhampur",
      
        // North-East India
        "Guwahati","Dibrugarh","Silchar","Tezpur",
        "Shillong","Tura","Nongpoh",
        "Aizawl","Lunglei",
        "Kohima","Dimapur","Mokokchung",
        "Imphal","Thoubal",
        "Agartala","Udaipur",
        "Itanagar","Naharlagun",
        "Gangtok","Namchi"
      ];
      
      var tokens = rawQuery.split(/\s+/);
      var last = tokens[tokens.length-1] || '';
      var cand = toTitle(last);
      if(knownCities.indexOf(cand) >= 0) city = cand;
    }

    // Page context
    var path = (window.location.pathname || '').split('/').pop() || 'index';
    var baseTitle = 'Herapheri Goods';

    // Title/Description builders
    function applyMeta(name, content){
      if(!content) return;
      var el = document.querySelector('meta[name="'+name+'"]');
      if(!el){ el = document.createElement('meta'); el.setAttribute('name', name); document.head.appendChild(el); }
      el.setAttribute('content', content);
    }
    function applyProperty(prop, content){
      if(!content) return;
      var el = document.querySelector('meta[property="'+prop+'"]');
      if(!el){ el = document.createElement('meta'); el.setAttribute('property', prop); document.head.appendChild(el); }
      el.setAttribute('content', content);
    }
    function ensureCanonical(){
      var link = document.querySelector('link[rel="canonical"]');
      if(!link){ link = document.createElement('link'); link.setAttribute('rel','canonical'); document.head.appendChild(link); }
      link.setAttribute('href', window.location.href);
    }
    function setTitle(t){ if(t) document.title = t; }

    // Build dynamic SEO
    var title = '';
    var desc = '';
    var ogTitle = '';
    var ogDesc = '';

    if(intent === 'register' || path.indexOf('register') === 0){
      var locStr = city ? (' in ' + city) : '';
      title = baseTitle + locStr + ' | Register Your Transport Vehicle';
      desc = 'Register your transport vehicle' + (type? ' ('+type+')':'') + (city? ' in '+city:'') + ' on Herapheri Goods. Free listing, reach more customers.';
    } else if(path.indexOf('vehicles') === 0 || intent === 'find') {
      var typeStr = type ? type : 'Transport Vehicles';
      var cityStr = city ? (' in ' + city) : '';
      title = baseTitle + cityStr + ' | Find ' + typeStr + cityStr;
      desc = 'Searching ' + (type? type.toLowerCase() : 'transport vehicles') + (city? ' in '+city:'') + '? Browse verified listings, contact owners directly, and get the best deal.';
    } else {
      // Homepage defaults with optional targeting
      if(type || city){
        var cityStr2 = city ? (' in ' + city) : '';
        title = baseTitle + cityStr2 + ' | Finding ' + (type? type : 'Transport Vehicles') + cityStr2;
        desc = 'Don\'t worry, search ' + (type? type : 'your vehicle') + (city? ' at your pincode in '+city:' at your pincode') + '. We\'ve got multiple transport vehicles you can check.';
      } else {
        title = baseTitle + ' | Aapka Apna Transport Network';
        desc = 'Find transport vehicles and register your own. Direct connection with owners, no middlemen.';
      }
    }

    ogTitle = title; ogDesc = desc;

    setTitle(title);
    applyMeta('description', desc);
    // Keywords (kept short; engines ignore long lists)
    applyMeta('keywords', [type, city, 'transport', 'vehicle', 'trucks', 'register vehicle', 'herapheri goods'].filter(Boolean).join(', '));
    applyProperty('og:title', ogTitle);
    applyProperty('og:description', ogDesc);
    applyProperty('og:type', 'website');
    applyProperty('og:url', window.location.href);
    applyMeta('twitter:card', 'summary');
    applyMeta('twitter:title', ogTitle);
    applyMeta('twitter:description', ogDesc);
    ensureCanonical();

    // Optional: update primary heading if present
    try {
      if(type || city){
        var h1 = document.querySelector('h1');
        if(h1){
          if(intent === 'register' || path.indexOf('register')===0) h1.textContent = 'Register Your Vehicle' + (city? ' in '+city : '');
          else if(path.indexOf('vehicles')===0 || intent==='find') h1.textContent = 'Find ' + (type || 'Transport Vehicles') + (city? ' in '+city : '');
          else h1.textContent = 'Finding ' + (type || 'Transport Vehicles') + (city? ' in '+city : '');
        }
      }
    } catch(_){ }

    // Add JSON-LD for WebSite and optional FAQ for registration intent
    function addJsonLd(obj){
      try {
        var s = document.createElement('script');
        s.type = 'application/ld+json';
        s.text = JSON.stringify(obj);
        document.head.appendChild(s);
      } catch(_){ }
    }
    // WebSite SearchAction
    addJsonLd({
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      'name': 'Herapheri Goods',
      'url': window.location.origin || 'https://herapherigoods.in',
      'potentialAction': {
        '@type': 'SearchAction',
        'target': (window.location.origin || 'https://herapherigoods.in') + '/?q={search_term_string}',
        'query-input': 'required name=search_term_string'
      }
    });

    if(intent === 'register' || /register|kaise\s+register/i.test(rawQuery)){
      addJsonLd({
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        'mainEntity': [
          {
            '@type': 'Question',
            'name': 'Apne truck ko kaise register kare?',
            'acceptedAnswer': {
              '@type': 'Answer',
              'text': 'Herapheri Goods par aap apna transport vehicle free mein register kar sakte hain. Bas Register page par jaakar form fill karein, 4 photos upload karein, aur submit kar dein.'
            }
          },
          {
            '@type': 'Question',
            'name': 'Kya registration free hai?',
            'acceptedAnswer': {
              '@type': 'Answer',
              'text': 'Haan, basic listing free hai. Premium plan se aap 5 vehicles tak register kar sakte hain aur zyada visibility pa sakte hain.'
            }
          }
        ]
      });
    }

    // Optional landing redirect behavior (only when explicitly provided)
    if(landing){
      var targetPath = null;
      if(landing === 'home') targetPath = (window.buildUrl ? window.buildUrl('index') : 'index');
      if(landing === 'vehicles') targetPath = (window.buildUrl ? window.buildUrl('vehicles') : 'vehicles');
      if(landing === 'register') targetPath = (window.buildUrl ? window.buildUrl('register') : 'register');
      if(targetPath){
        var current = (window.location.pathname || '').split('/').pop() || 'index';
        if(current.indexOf(targetPath) !== 0){
          // Prevent redirect loops
          if(!sessionStorage.getItem('seoLandingDone')){
            sessionStorage.setItem('seoLandingDone','1');
            var qs = window.location.search.replace(/([?&])landing=[^&]*/,'$1').replace(/[?&]$/,'');
            var url = targetPath + (qs ? qs : '');
            window.location.replace(url);
          }
        }
      }
    }

  } catch (e) { /* silent */ }
})();


