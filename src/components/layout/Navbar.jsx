import { Link } from "react-router-dom";

import "../../styles/navbar.css";

function Navbar() {
  return (
    <header>
      <div className="navbar">

        <div className="logo">
          YAŞAR <span>GÖKÇEEV</span>
        </div>

        <nav className="menu">

          <Link to="/">Ana Sayfa</Link>

          <Link to="/randevu">Randevu Al</Link>

          <Link to="/iletisim">İletişim</Link>

          <Link to="/admin">Yönetici</Link>

        </nav>

        <Link className="appointmentBtn" to="/randevu">
          Randevu Al
        </Link>

      </div>
    </header>
  );
}

export default Navbar;