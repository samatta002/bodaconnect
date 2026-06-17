import { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiArrowRight,
  FiCheckCircle,
  FiChevronDown,
  FiClock,
  FiHeadphones,
  FiMail,
  FiMapPin,
  FiMessageCircle,
  FiNavigation,
  FiPhone,
  FiShield,
  FiSmartphone,
  FiStar,
  FiTrendingUp,
  FiUsers,
  FiZap,
} from "react-icons/fi";

const content = {
  en: {
    chip: "Live boda boda ride matching",
    hero: "A modern ride platform connecting passengers and trusted boda boda drivers across the city with live booking, status, and location updates.",
    book: "Book a Ride",
    explore: "Explore BodaConnect",
    stats: [
      ["2,400+", "Rides matched", <FiNavigation />],
      ["98%", "On-time pickup", <FiTrendingUp />],
      ["4.9", "Driver rating", <FiStar />],
      ["24/7", "Support", <FiHeadphones />],
    ],
    aboutBadge: "About us",
    aboutTitle: "Built for faster, safer city movement.",
    aboutCopy: "BodaConnect brings the familiar boda boda experience into a clear digital workflow for passengers, drivers, and operators.",
    eventTitle: "Real ride events, not static screens.",
    eventCopy: "Every booking follows a practical flow: a passenger requests a ride, a driver accepts, the trip becomes active, and completion updates return to the dashboard.",
    checks: ["Realtime ride requests", "Driver dashboard status syncing", "Backend, MySQL, Prometheus, and Grafana stack"],
    steps: [
      ["01", "Passenger books", "Pickup and destination are selected from the map or list."],
      ["02", "Driver accepts", "The driver dashboard receives the request and confirms the ride."],
      ["03", "Trip updates", "Status and location updates keep both sides in sync."],
    ],
    featuresBadge: "Features",
    featuresTitle: "Everything feels connected.",
    featuresCopy: "Designed to make the app feel active, useful, and dependable from the first click.",
    features: [
      ["green", <FiZap />, "Fast ride matching", "New requests reach nearby drivers instantly through live ride updates."],
      ["blue", <FiShield />, "Driver-first safety", "Driver profiles, plates, ride states, and trip progress stay visible."],
      ["amber", <FiSmartphone />, "Live trip updates", "Passengers and drivers see the ride move from pending to accepted to completed."],
      ["white", <FiClock />, "Always available", "Built for quick city movement, busy streets, and repeat daily use."],
    ],
    phoneBadge: "Live preview",
    phoneTitle: "A ride moving in your hand.",
    phoneCopy: "The app experience is designed around real-time feedback: request received, driver accepted, moving to pickup, and trip completed.",
    phoneStatus: ["Request sent", "Driver accepted", "On route", "Arriving"],
    faqBadge: "FAQ",
    faqTitle: "Frequently asked questions.",
    faqs: [
      ["How does BodaConnect match rides?", "A passenger request is saved by the backend and broadcast instantly to connected drivers."],
      ["Can a driver see passenger requests in real time?", "Yes. The dashboard refreshes automatically as new ride activity arrives."],
      ["What happens after a driver accepts?", "The ride changes from pending to accepted, then the backend syncs completion events back into MySQL for the frontend."],
      ["Is BodaConnect only for Dar es Salaam?", "The current demo is tuned for Dar es Salaam locations, but the same flow can support more cities."],
    ],
    contactBadge: "Contact us",
    contactTitle: "Let us build the route together.",
    contactCopy: "Reach the BodaConnect team for support, demos, and deployment questions.",
    ready: "Ready now",
    finalTitle: "Book, accept, ride, complete.",
    finalCopy: "BodaConnect turns every trip into a clear live event.",
    start: "Start Booking",
    footerCopy: "Realtime boda boda booking, driver coordination, and ride visibility for everyday city movement.",
    quickLinks: "Quick links",
    legal: "Legal",
    terms: "Terms & Conditions",
    privacy: "Privacy Policy",
    copyright: "All rights reserved.",
    developer: "Developed by",
  },
  sw: {
    chip: "Uunganishaji wa safari mubashara",
    hero: "Mfumo wa kisasa unaowaunganisha abiria na madereva wa boda boda wanaoaminika kupitia booking, hali ya safari, na taarifa za eneo kwa wakati halisi.",
    book: "Agiza Safari",
    explore: "Chunguza BodaConnect",
    stats: [
      ["2,400+", "Safari zilizounganishwa", <FiNavigation />],
      ["98%", "Pickup kwa wakati", <FiTrendingUp />],
      ["4.9", "Kiwango cha madereva", <FiStar />],
      ["24/7", "Msaada", <FiHeadphones />],
    ],
    aboutBadge: "Kuhusu sisi",
    aboutTitle: "Imejengwa kwa usafiri wa haraka na salama mjini.",
    aboutCopy: "BodaConnect inaleta uzoefu wa boda boda kwenye mfumo wa kidigitali ulio wazi kwa abiria, madereva, na waendeshaji.",
    eventTitle: "Matukio halisi ya safari, si skrini tulivu.",
    eventCopy: "Kila booking ina mtiririko wa vitendo: abiria anaomba safari, dereva anakubali, safari inaanza, kisha taarifa za kukamilika zinarudi kwenye dashboard.",
    checks: ["Maombi ya safari mubashara", "Usawazishaji wa hali kwenye dashboard", "Backend, MySQL, Prometheus, na Grafana"],
    steps: [
      ["01", "Abiria anaagiza", "Pickup na destination huchaguliwa kwenye ramani au orodha."],
      ["02", "Dereva anakubali", "Dashboard ya dereva inapokea ombi na kuthibitisha safari."],
      ["03", "Safari inasasishwa", "Hali na eneo la safari hubaki sambamba pande zote."],
    ],
    featuresBadge: "Vipengele",
    featuresTitle: "Kila kitu kimeunganishwa.",
    featuresCopy: "Imeundwa kufanya app ionekane hai, yenye manufaa, na ya kuaminika tangu mwanzo.",
    features: [
      ["green", <FiZap />, "Kuunganisha haraka", "Maombi mapya huwafikia madereva wa karibu kupitia masasisho ya moja kwa moja."],
      ["blue", <FiShield />, "Usalama wa dereva", "Profaili, plate, hali ya safari, na maendeleo hubaki wazi."],
      ["amber", <FiSmartphone />, "Taarifa mubashara", "Abiria na madereva huona safari ikitoka pending hadi accepted na completed."],
      ["white", <FiClock />, "Inapatikana muda wote", "Imejengwa kwa mahitaji ya haraka ya usafiri wa kila siku."],
    ],
    phoneBadge: "Muonekano mubashara",
    phoneTitle: "Safari inayosogea mkononi.",
    phoneCopy: "Uzoefu wa app umejengwa kwenye taarifa za wakati halisi: ombi limepokelewa, dereva amekubali, yuko njiani, na safari imekamilika.",
    phoneStatus: ["Ombi limetumwa", "Dereva amekubali", "Yuko njiani", "Anakaribia"],
    faqBadge: "Maswali",
    faqTitle: "Maswali yanayoulizwa mara kwa mara.",
    faqs: [
      ["BodaConnect inaunganisha vipi safari?", "Ombi la abiria huhifadhiwa na backend kisha hutumwa papo hapo kwa madereva waliounganishwa."],
      ["Dereva anaweza kuona maombi mubashara?", "Ndiyo. Dashboard hujisahihisha yenyewe kadri shughuli mpya za safari zinavyofika."],
      ["Nini hutokea dereva akikubali?", "Safari hubadilika kutoka pending hadi accepted, kisha backend husawazisha completed kwenye MySQL kwa frontend."],
      ["BodaConnect ni ya Dar es Salaam pekee?", "Demo ya sasa imetengenezwa kwa maeneo ya Dar es Salaam, lakini mtiririko unaweza kutumika kwenye miji mingine."],
    ],
    contactBadge: "Wasiliana nasi",
    contactTitle: "Tujenge njia pamoja.",
    contactCopy: "Wasiliana na timu ya BodaConnect kwa msaada, demo, na maswali ya deployment.",
    ready: "Tayari sasa",
    finalTitle: "Agiza, kubali, safiri, kamilisha.",
    finalCopy: "BodaConnect hufanya kila safari kuwa tukio la wazi na mubashara.",
    start: "Anza Booking",
    footerCopy: "Booking ya boda boda mubashara, uratibu wa madereva, na ufuatiliaji wa safari kwa usafiri wa kila siku mjini.",
    quickLinks: "Viungo",
    legal: "Sheria",
    terms: "Vigezo na Masharti",
    privacy: "Sera ya Faragha",
    copyright: "Haki zote zimehifadhiwa.",
    developer: "Imetengenezwa na",
  },
};

export default function Home({ lang = "en" }) {
  const [openFaq, setOpenFaq] = useState(0);
  const t = content[lang] || content.en;

  return (
    <div className="home-page">
      <section className="home-hero" aria-label="BodaConnect homepage">
        <img className="home-hero-image" src="/home-hero.png" alt="BodaConnect boda boda driver ready for a ride" />
        <div className="home-hero-shade" />
        <div className="home-float-icon float-map"><FiMapPin /></div>
        <div className="home-float-icon float-phone"><FiSmartphone /></div>
        <div className="home-float-icon float-shield"><FiShield /></div>

        <div className="home-hero-content">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="home-chip">
            <span className="pulse-dot" />
            {t.chip}
          </motion.div>

          <motion.h1 initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
            BodaConnect
          </motion.h1>

          <motion.p initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }} className="home-hero-copy">
            {t.hero}
          </motion.p>

          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.24 }} className="home-actions">
            <Link to="/ride" className="btn btn-primary btn-xl">{t.book} <FiArrowRight size={18} /></Link>
            <a href="#about" className="btn btn-outline btn-xl">{t.explore}</a>
          </motion.div>
        </div>
      </section>

      <motion.section className="home-stats" aria-label="BodaConnect highlights" initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
        {t.stats.map(([value, label, icon]) => (
          <div className="home-stat" key={label}>
            <div className="home-stat-icon">{icon}</div>
            <strong>{value}</strong>
            <span>{label}</span>
          </div>
        ))}
      </motion.section>

      <section id="about" className="home-section home-about">
        <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="home-section-heading">
          <span className="badge badge-green">{t.aboutBadge}</span>
          <h2>{t.aboutTitle}</h2>
          <p>{t.aboutCopy}</p>
        </motion.div>

        <div className="home-about-grid">
          <motion.div initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="home-about-copy">
            <h3>{t.eventTitle}</h3>
            <p>{t.eventCopy}</p>
            <div className="home-check-list">
              {t.checks.map((check) => <span key={check}><FiCheckCircle /> {check}</span>)}
            </div>
          </motion.div>

          <div className="home-process">
            {t.steps.map(([step, title, desc], index) => (
              <motion.div key={step} initial={{ opacity: 0, x: 24 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: index * 0.1 }} className="home-process-item">
                <strong>{step}</strong>
                <div><h4>{title}</h4><p>{desc}</p></div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="home-section">
        <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="home-section-heading">
          <span className="badge badge-blue">{t.featuresBadge}</span>
          <h2>{t.featuresTitle}</h2>
          <p>{t.featuresCopy}</p>
        </motion.div>

        <div className="home-feature-grid">
          {t.features.map(([tone, icon, title, desc], index) => (
            <motion.div key={title} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: index * 0.08 }} className={`home-feature-card tone-${tone}`}>
              <div className="home-feature-icon">{icon}</div>
              <h3>{title}</h3>
              <p>{desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="home-section home-ride-showcase">
        <motion.div initial={{ opacity: 0, x: -28 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="home-section-heading compact">
          <span className="badge badge-green">{t.phoneBadge}</span>
          <h2>{t.phoneTitle}</h2>
          <p>{t.phoneCopy}</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, x: 28 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="phone-demo">
          <div className="phone-shell">
            <div className="phone-top" />
            <div className="phone-map">
              <div className="map-grid" />
              <div className="route-line" />
              <div className="route-bike"><FiNavigation /></div>
              <div className="pin pickup"><FiMapPin /></div>
              <div className="pin destination"><FiMapPin /></div>
              <div className="phone-card">
                <strong>BodaConnect</strong>
                <span>{t.phoneStatus[2]}</span>
              </div>
            </div>
          </div>
          <div className="phone-status-list">
            {t.phoneStatus.map((status, index) => (
              <span key={status} style={{ animationDelay: `${index * 0.45}s` }}>
                <FiCheckCircle /> {status}
              </span>
            ))}
          </div>
        </motion.div>
      </section>

      <section id="faq" className="home-section home-faq-contact">
        <div className="home-faq">
          <div className="home-section-heading compact">
            <span className="badge badge-orange">{t.faqBadge}</span>
            <h2>{t.faqTitle}</h2>
          </div>

          <div className="faq-list">
            {t.faqs.map(([q, a], index) => {
              const isOpen = openFaq === index;
              return (
                <div className="faq-item" key={q}>
                  <button type="button" onClick={() => setOpenFaq(isOpen ? null : index)}>
                    <span>{q}</span>
                    <FiChevronDown className={isOpen ? "open" : ""} />
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen && <motion.p initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}>{a}</motion.p>}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>

        <div id="contact" className="home-contact">
          <div className="home-section-heading compact">
            <span className="badge badge-green">{t.contactBadge}</span>
            <h2>{t.contactTitle}</h2>
            <p>{t.contactCopy}</p>
          </div>

          <div className="contact-list">
            <a href="mailto:support@bodaconnect.app"><FiMail /><span>support@bodaconnect.app</span></a>
            <a href="tel:+255700000000"><FiPhone /><span>+255 700 000 000</span></a>
            <span><FiMapPin /><span>Dar es Salaam, Tanzania</span></span>
            <span><FiMessageCircle /><span>Response within 24 hours</span></span>
          </div>
        </div>
      </section>

      <section className="home-final-cta">
        <div>
          <span className="badge badge-white">{t.ready}</span>
          <h2>{t.finalTitle}</h2>
          <p>{t.finalCopy}</p>
        </div>
        <Link to="/ride" className="btn btn-primary btn-lg">{t.start} <FiArrowRight /></Link>
      </section>

      <footer className="home-footer">
        <div className="home-footer-brand">
          <Link to="/" className="home-footer-logo">
            <span>Boda</span><strong>Connect</strong>
          </Link>
          <p>{t.footerCopy}</p>
          <span className="home-footer-credit">
            {t.developer} <strong>Mbwana Ally</strong>
          </span>
        </div>

        <div className="home-footer-links">
          <div>
            <h3>{t.quickLinks}</h3>
            <a href="#about">About</a>
            <a href="#faq">FAQ</a>
            <a href="#contact">Contact</a>
            <Link to="/ride">{t.book}</Link>
          </div>
          <div>
            <h3>{t.legal}</h3>
            <a href="#terms">{t.terms}</a>
            <a href="#privacy">{t.privacy}</a>
            <a href="mailto:support@bodaconnect.app">Support</a>
          </div>
        </div>

        <div className="home-footer-legal">
          <span>&copy; {new Date().getFullYear()} BodaConnect. {t.copyright}</span>
          <span id="terms">{t.terms}: Ride requests, driver acceptance, and trip updates depend on network and service availability.</span>
          <span id="privacy">{t.privacy}: BodaConnect uses trip and driver details only to coordinate bookings and improve service visibility.</span>
        </div>
      </footer>
    </div>
  );
}
