import { Link } from "react-router-dom";

import {
  FaInstagram,
  FaWhatsapp,
  FaPhoneAlt,
  FaMapMarkerAlt,
  FaClock,
  FaCalendarCheck,
  FaDirections,
  FaArrowRight,
} from "react-icons/fa";

import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";

import "../styles/contact.css";

const PHONE_DISPLAY = "0538 292 90 79";
const PHONE_LINK = "tel:+905382929079";

const WHATSAPP_LINK =
  "https://wa.me/905382929079?text=Merhaba%2C%20randevu%20hakk%C4%B1nda%20bilgi%20almak%20istiyorum.";

const INSTAGRAM_LINK =
  "https://www.instagram.com/yasar_gokceev_hairdesigner_?igsh=MWI2aTAzMzNuMHV1";

const LOCATION_LINK =
  "https://www.google.com/maps/search/?api=1&query=39.636306,27.890722";

const MAP_EMBED_LINK =
  "https://www.google.com/maps?q=39.636306,27.890722&z=17&output=embed";

function Contact() {
  return (
    <>
      <Navbar />

      <main className="contactPage">
        <section className="contactHero">
          <div className="contactHeroGlow contactHeroGlowOne"></div>
          <div className="contactHeroGlow contactHeroGlowTwo"></div>

          <div className="contactHeroContent">
            <span className="contactHeroLabel">
              YAŞAR GÖKÇEEV HAIR DESIGNER
            </span>

            <h1>
              Bizimle <span>İletişime Geçin</span>
            </h1>

            <p>
              Randevu, konum ve çalışma saatleriyle ilgili tüm bilgilere
              buradan ulaşabilirsiniz.
            </p>

            <div className="contactHeroButtons">
              <Link to="/randevu" className="contactPrimaryButton">
                <FaCalendarCheck />
                Randevu Al
                <FaArrowRight className="contactButtonArrow" />
              </Link>

              <a
                href={WHATSAPP_LINK}
                target="_blank"
                rel="noreferrer"
                className="contactSecondaryButton"
              >
                <FaWhatsapp />
                WhatsApp
              </a>
            </div>
          </div>
        </section>

        <section className="contactContent">
          <div className="contactSectionHeading">
            <span>İLETİŞİM BİLGİLERİ</span>
            <h2>Size Bir Mesaj Kadar Yakınız</h2>
            <p>
              Aşağıdaki iletişim kanallarından bize kolayca ulaşabilir veya
              harita üzerinden yol tarifi alabilirsiniz.
            </p>
          </div>

          <div className="contactMainGrid">
            <div className="contactInformationColumn">
              <article className="contactSalonCard">
                <div className="contactSalonTop">
                  <div className="contactSalonLogo">
                    <span>YG</span>
                  </div>

                  <div>
                    <span className="contactSalonLabel">HAIR DESIGNER</span>
                    <h3>Yaşar Gökçeev</h3>
                    <p>Profesyonel bakım ve modern saç tasarımı</p>
                  </div>
                </div>

                <div className="contactGoldLine"></div>

                <div className="contactQuickInformation">
                  <div>
                    <FaClock />
                    <span>
                      <small>Çalışma saatleri</small>
                      Her Gün 09:00 – 21:00
                    </span>
                  </div>

                  <div>
                    <FaMapMarkerAlt />
                    <span>
                      <small>Salon konumu</small>
                      Balıkesir
                    </span>
                  </div>
                </div>
              </article>

              <div className="contactCardsGrid">
                <a href={PHONE_LINK} className="contactInfoCard">
                  <div className="contactInfoIcon contactPhoneIcon">
                    <FaPhoneAlt />
                  </div>

                  <div className="contactInfoText">
                    <span>Telefon</span>
                    <strong>{PHONE_DISPLAY}</strong>
                    <small>Aramak için tıklayın</small>
                  </div>

                  <FaArrowRight className="contactCardArrow" />
                </a>

                <a
                  href={WHATSAPP_LINK}
                  target="_blank"
                  rel="noreferrer"
                  className="contactInfoCard"
                >
                  <div className="contactInfoIcon contactWhatsappIcon">
                    <FaWhatsapp />
                  </div>

                  <div className="contactInfoText">
                    <span>WhatsApp</span>
                    <strong>Mesaj Gönder</strong>
                    <small>Hızlı iletişim</small>
                  </div>

                  <FaArrowRight className="contactCardArrow" />
                </a>

                <a
                  href={INSTAGRAM_LINK}
                  target="_blank"
                  rel="noreferrer"
                  className="contactInfoCard"
                >
                  <div className="contactInfoIcon contactInstagramIcon">
                    <FaInstagram />
                  </div>

                  <div className="contactInfoText">
                    <span>Instagram</span>
                    <strong>@yasar_gokceev_hairdesigner_</strong>
                    <small>Çalışmalarımızı inceleyin</small>
                  </div>

                  <FaArrowRight className="contactCardArrow" />
                </a>

                <a
                  href={LOCATION_LINK}
                  target="_blank"
                  rel="noreferrer"
                  className="contactInfoCard"
                >
                  <div className="contactInfoIcon contactLocationIcon">
                    <FaDirections />
                  </div>

                  <div className="contactInfoText">
                    <span>Yol Tarifi</span>
                    <strong>Haritada Aç</strong>
                    <small>Konuma kolayca ulaşın</small>
                  </div>

                  <FaArrowRight className="contactCardArrow" />
                </a>
              </div>
            </div>

            <div className="contactMapColumn">
              <div className="contactMapCard">
                <div className="contactMapHeader">
                  <div>
                    <span>Salon Konumu</span>
                    <h3>Bizi Haritada Bulun</h3>
                  </div>

                  <a
                    href={LOCATION_LINK}
                    target="_blank"
                    rel="noreferrer"
                    className="contactMapDirectionButton"
                  >
                    <FaDirections />
                    Yol Tarifi
                  </a>
                </div>

                <div className="contactMapWrapper">
                  <iframe
                    title="Yaşar Gökçeev Hair Designer Konumu"
                    src={MAP_EMBED_LINK}
                    width="100%"
                    height="100%"
                    loading="lazy"
                    allowFullScreen
                    referrerPolicy="no-referrer-when-downgrade"
                  ></iframe>

                  <div className="contactMapBadge">
                    <div className="contactMapBadgeIcon">
                      <FaMapMarkerAlt />
                    </div>

                    <div>
                      <strong>Yaşar Gökçeev</strong>
                      <span>Hair Designer</span>
                    </div>
                  </div>
                </div>

                <div className="contactMapFooter">
                  <div>
                    <FaMapMarkerAlt />
                    <span>
                      <small>Koordinatlar</small>
                      39.636306, 27.890722
                    </span>
                  </div>

                  <a
                    href={LOCATION_LINK}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Google Maps&apos;te aç
                    <FaArrowRight />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="contactAppointmentBanner">
          <div className="contactAppointmentPattern"></div>

          <div className="contactAppointmentContent">
            <div className="contactAppointmentIcon">
              <FaCalendarCheck />
            </div>

            <div>
              <span>RANDEVUNUZU ŞİMDİ OLUŞTURUN</span>
              <h2>Size Uygun Gün ve Saati Seçin</h2>
              <p>
                Önümüzdeki 14 gün içerisindeki boş saatleri görüntüleyerek
                randevunuzu birkaç adımda oluşturabilirsiniz.
              </p>
            </div>
          </div>

          <Link to="/randevu" className="contactAppointmentButton">
            Randevu Al
            <FaArrowRight />
          </Link>
        </section>
      </main>

      <Footer />
    </>
  );
}

export default Contact;