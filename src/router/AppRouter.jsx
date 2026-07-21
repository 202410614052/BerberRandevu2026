import { BrowserRouter, Route, Routes } from "react-router-dom";

import Home from "../pages/Home";
import Appointment from "../pages/Appointment";
import Contact from "../pages/Contact";
import Admin from "../pages/Admin";

function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/randevu" element={<Appointment />} />
        <Route path="/iletisim" element={<Contact />} />
        <Route path="/admin" element={<Admin />} />
      </Routes>
    </BrowserRouter>
  );
}

export default AppRouter;