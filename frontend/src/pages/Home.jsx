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

const stats = [
  { value: "2,400+", label: "Rides matched", icon: <FiNavigation /> },
  { value: "98%", label: "On-time pickup", icon: <FiTrendingUp /> },
  { value: "4.9", label: "Driver rating", icon: <FiStar /> },
  { value: "24/7", label: "Support", icon: <FiHeadphones /> },
];

const features = [
  {
    icon: <FiZap />,
    title: "Fast ride matching",
    desc: "New requests reach nearby drivers instantly through live MQTT events.",
    tone: "green",
  },
  {
    icon: <FiShield />,
    title: "Driver-first safety",
    desc: "Driver profiles, plates, ride states, and trip progress stay visible.",
    tone: "blue",
  },
  {
    icon: <FiSmartphone />,
    title: "Live trip updates",
    desc: "Passengers and drivers see the ride move from pending to accepted to completed.",
    tone: "amber",
  },
  {
    icon: <FiClock />,
    title: "Always available",
    desc: "Built for quick city movement, busy streets, and repeat daily use.",
    tone: "white",
  },
];

const howItWorks = [
  { step: "01", title: "Passenger books", desc: "Pickup and destination are selected from the map or list." },
  { step: "02", title: "Driver accepts", desc: "The driver dashboard receives the request and confirms the ride." },
  { step: "03", title: "Trip updates", desc: "Status and location updates keep both sides in sync." },
];

const faqs = [
  {
    q: "How does BodaConnect match rides?",
    a: "A passenger request is saved by the backend and published as an MQTT event. Connected drivers receive it immediately.",
  },
  {
    q: "Can a driver see passenger requests in real time?",
    a: "Yes. The dashboard refreshes automatically, and the driver simulator listens to the same live ride/request topic.",
  },
  {
    q: "What happens after a driver accepts?",
    a: "The ride changes from pending to accepted, then the backend syncs completion events back into MySQL for the frontend.",
  },
  {
    q: "Is BodaConnect only for Dar es Salaam?",
    a: "The current demo is tuned for Dar es Salaam locations, but the same flow can support more cities.",
  },
];

export default function Home() {
  const [openFaq, setOpenFaq] = useState(0);

  return (
    <div className="home-page">
      <section className="home-hero" aria-label="BodaConnect homepage">
        <img className="home-hero-image" src="/home-hero.png" alt="BodaConnect boda boda driver ready for a ride" />
        <div className="home-hero-shade" />
        <div className="home-float-icon float-map"><FiMapPin /></div>
        <div className="home-float-icon float-phone"><FiSmartphone /></div>
        <div className="home-float-icon float-shield"><FiShield /></div>

        <div className="home-hero-content">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="home-chip"
          >
            <span className="pulse-dot" />
            Live boda boda ride matching
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
          >
            BodaConnect
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.16 }}
            className="home-hero-copy"
          >
            A modern ride platform connecting passengers and trusted boda boda drivers across the city with live booking, status, and location updates.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.24 }}
            className="home-actions"
          >
            <Link to="/ride" className="btn btn-primary btn-xl">
              Book a Ride <FiArrowRight size={18} />
            </Link>
            <a href="#about" className="btn btn-outline btn-xl">
              Explore BodaConnect
            </a>
          </motion.div>
        </div>
      </section>

      <section className="home-stats" aria-label="BodaConnect highlights">
        {stats.map((item) => (
          <div className="home-stat" key={item.label}>
            <div className="home-stat-icon">{item.icon}</div>
            <strong>{item.value}</strong>
            <span>{item.label}</span>
          </div>
        ))}
      </section>

      <section id="about" className="home-section home-about">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="home-section-heading"
        >
          <span className="badge badge-green">About us</span>
          <h2>Built for faster, safer city movement.</h2>
          <p>
            BodaConnect brings the familiar boda boda experience into a clear digital workflow for passengers, drivers, and operators.
          </p>
        </motion.div>

        <div className="home-about-grid">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="home-about-copy"
          >
            <h3>Real ride events, not static screens.</h3>
            <p>
              Every booking follows a practical flow: a passenger requests a ride, a driver accepts, the trip becomes active, and completion updates return to the dashboard.
            </p>
            <div className="home-check-list">
              <span><FiCheckCircle /> MQTT-powered ride requests</span>
              <span><FiCheckCircle /> Driver dashboard status syncing</span>
              <span><FiCheckCircle /> Backend, MySQL, Prometheus, and Grafana stack</span>
            </div>
          </motion.div>

          <div className="home-process">
            {howItWorks.map((step, index) => (
              <motion.div
                key={step.step}
                initial={{ opacity: 0, x: 18 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.08 }}
                className="home-process-item"
              >
                <strong>{step.step}</strong>
                <div>
                  <h4>{step.title}</h4>
                  <p>{step.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="home-section">
        <div className="home-section-heading">
          <span className="badge badge-blue">Features</span>
          <h2>Everything feels connected.</h2>
          <p>Designed to make the app feel active, useful, and dependable from the first click.</p>
        </div>

        <div className="home-feature-grid">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.07 }}
              className={`home-feature-card tone-${feature.tone}`}
            >
              <div className="home-feature-icon">{feature.icon}</div>
              <h3>{feature.title}</h3>
              <p>{feature.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <section id="faq" className="home-section home-faq-contact">
        <div className="home-faq">
          <div className="home-section-heading compact">
            <span className="badge badge-orange">FAQ</span>
            <h2>Frequently asked questions.</h2>
          </div>

          <div className="faq-list">
            {faqs.map((faq, index) => {
              const isOpen = openFaq === index;
              return (
                <div className="faq-item" key={faq.q}>
                  <button type="button" onClick={() => setOpenFaq(isOpen ? null : index)}>
                    <span>{faq.q}</span>
                    <FiChevronDown className={isOpen ? "open" : ""} />
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.p
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                      >
                        {faq.a}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>

        <div id="contact" className="home-contact">
          <div className="home-section-heading compact">
            <span className="badge badge-green">Contact us</span>
            <h2>Let us build the route together.</h2>
            <p>Reach the BodaConnect team for support, demos, and deployment questions.</p>
          </div>

          <div className="contact-list">
            <a href="mailto:support@bodaconnect.app">
              <FiMail />
              <span>support@bodaconnect.app</span>
            </a>
            <a href="tel:+255700000000">
              <FiPhone />
              <span>+255 700 000 000</span>
            </a>
            <span>
              <FiMapPin />
              <span>Dar es Salaam, Tanzania</span>
            </span>
            <span>
              <FiMessageCircle />
              <span>Response within 24 hours</span>
            </span>
          </div>
        </div>
      </section>

      <section className="home-final-cta">
        <div>
          <span className="badge badge-white">Ready now</span>
          <h2>Book, accept, ride, complete.</h2>
          <p>BodaConnect turns every trip into a clear live event.</p>
        </div>
        <Link to="/ride" className="btn btn-primary btn-lg">
          Start Booking <FiArrowRight />
        </Link>
      </section>
    </div>
  );
}
