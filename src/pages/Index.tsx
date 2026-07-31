import { useEffect } from "react";
import Navbar from "@/components/Navbar";
import SenegalProductHero from "@/components/SenegalProductHero";
import LiveOperations from "@/components/LiveOperations";
import Modules from "@/components/Modules";
import StakeholderGateway from "@/components/StakeholderGateway";
import AboutAymane from "@/components/AboutAymane";
import CTA from "@/components/CTA";
import Footer from "@/components/Footer";
import MobileActionDock from "@/components/MobileActionDock";

const Index = () => {
  useEffect(() => {
    document.title = "AYMANE - Le bon soin, plus vite au Sénégal";
    const meta = document.querySelector('meta[name="description"]') || document.createElement("meta");
    meta.setAttribute("name", "description");
    meta.setAttribute(
      "content",
      "AYMANE rapproche patients, soignants, pharmacies, laboratoires et urgences au Sénégal. Décrivez le besoin, trouvez la bonne adresse et agissez plus vite depuis le mobile.",
    );
    if (!meta.parentNode) document.head.appendChild(meta);
  }, []);

  return (
    <div className="app-page-gradient min-h-[100dvh]">
      <Navbar />
      <main id="main-content">
        <SenegalProductHero />
        <LiveOperations />
        <Modules />
        <StakeholderGateway />
        <AboutAymane />
        <CTA />
      </main>
      <MobileActionDock />
      <Footer />
    </div>
  );
};

export default Index;
