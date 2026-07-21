import { Link } from "react-router-dom";

import {
  FaInstagram,
  FaWhatsapp,
  FaPhoneAlt,
  FaMapMarkerAlt,
} from "react-icons/fa";

import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";

import "../styles/home.css";

function Home() {
  return (
    <>
      <Navbar />

      <main>
        <section className="hero">
          <div className="heroContent">
            <p className="heroTopText">Profesyonel Erkek Bakımı</p>

            <h1>
              YAŞAR <span>GÖKÇEEV</span>
            </h1>

            <h2>Hair Designer</h2>

            <p className="heroDescription">
              Profesyonel ekibimizle modern saç ve sakal tasarımlarında
              kaliteli hizmet sunuyoruz. Size uygun çalışanı, tarihi ve saati
              seçerek randevunuzu hızlı ve kolay bir şekilde
              oluşturabilirsiniz.
            </p>

            <div className="heroButtons">
              <Link to="/randevu" className="heroButton">
                Randevu Al
              </Link>

              <Link to="/iletisim" className="heroButton secondaryButton">
                İletişim
              </Link>
            </div>
          </div>
        </section>

        <section className="informationSection">
          <div className="sectionTitle">
            <p>Salon Bilgileri</p>

            <h2>Size Hizmet Vermeye Hazırız</h2>
          </div>

          <div className="informationGrid">
            <article className="informationCard">
              <div className="informationIcon">
                <FaPhoneAlt />
              </div>

              <h3>Telefon</h3>

              <p>Randevu ve bilgi için bizi arayabilirsiniz.</p>

              <a href="tel:+905382929079">0538 292 90 79</a>
            </article>

            <article className="informationCard">
              <div className="informationIcon">
                <FaMapMarkerAlt />
              </div>

              <h3>Adres</h3>

              <p>
                Salonumuza yol tarifi almak için haritada
                görüntüleyebilirsiniz.
              </p>

              <a
                href="https://maps.google.com/?q=39.636306,27.890722"
                target="_blank"
                rel="noreferrer"
              >
                Haritada Görüntüle
              </a>
            </article>

            <article className="informationCard">
              <div className="informationIcon">
                <FaWhatsapp />
              </div>

              <h3>WhatsApp</h3>

              <p>WhatsApp üzerinden bizimle iletişime geçin.</p>

              <a
                href="https://wa.me/905382929079"
                target="_blank"
                rel="noreferrer"
              >
                WhatsApp&apos;tan Yaz
              </a>
            </article>

            <article className="informationCard">
              <div className="informationIcon">
                <FaInstagram />
              </div>

              <h3>Instagram</h3>

              <p>
                Çalışmalarımızı incelemek ve bizi takip etmek için Instagram
                hesabımızı ziyaret edin.
              </p>

              <a
                href="https://www.instagram.com/yasar_gokceev_hairdesigner_?igsh=MWI2aTAzMzNuMHV1"
                target="_blank"
                rel="noreferrer"
              >
                Instagram&apos;a Git
              </a>
            </article>
          </div>
        </section>

        <section className="workingHoursSection">
          <div className="workingHoursCard">
            <div className="workingHoursText">
              <p className="smallTitle">Çalışma Saatleri</p>

              <h2>Randevunuzu Size Uygun Zamana Oluşturun</h2>

              <p>
                Salonumuz haftanın her günü 09.00 ile 21.00 saatleri arasında
                hizmet vermektedir. Uygun gün ve saatleri randevu ekranından
                görüntüleyebilirsiniz.
              </p>

              <Link to="/randevu" className="workingHoursButton">
                Uygun Saatleri Gör
              </Link>
            </div>

            <div className="hoursList">
              <div>
                <span>Pazartesi</span>
                <strong>09:00 - 21:00</strong>
              </div>

              <div>
                <span>Salı</span>
                <strong>09:00 - 21:00</strong>
              </div>

              <div>
                <span>Çarşamba</span>
                <strong>09:00 - 21:00</strong>
              </div>

              <div>
                <span>Perşembe</span>
                <strong>09:00 - 21:00</strong>
              </div>

              <div>
                <span>Cuma</span>
                <strong>09:00 - 21:00</strong>
              </div>

              <div>
                <span>Cumartesi</span>
                <strong>09:00 - 21:00</strong>
              </div>

              <div>
                <span>Pazar</span>
                <strong>09:00 - 21:00</strong>
              </div>
            </div>
          </div>
        </section>

        <section className="mapSection">
          <div className="sectionTitle">
            <p>Konum</p>

            <h2>Salonumuza Kolayca Ulaşın</h2>
          </div>

          <div className="mapContainer">
            <iframe
              title="Yaşar Gökçeev Hair Designer Konum"
              src="https://maps.google.com/maps?q=39.636306,27.890722&t=&z=17&ie=UTF8&iwloc=&output=embed"
              width="100%"
              height="450"
              style={{ border: 0 }}
              loading="lazy"
              allowFullScreen
            />
          </div>

          <div className="mapButtonArea">
            <a
              href="https://maps.google.com/?q=39.636306,27.890722"
              target="_blank"
              rel="noreferrer"
              className="mapButton"
            >
              Google Haritalar&apos;da Aç
            </a>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}

export default Home;