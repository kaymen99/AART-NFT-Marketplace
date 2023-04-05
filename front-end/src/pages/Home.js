import React from "react";
import "../assets/styles/pages/home.css";
import {
  NavBar,
  Hero,
  Services,
  AuctionSlider,
  HotSales,
  Footer,
  Banner,
} from "../components";

const Home = () => {
  return (
    <div className="home">
      <NavBar />
      <Hero />
      <Services />
      {/* <Sellers /> */}
      <AuctionSlider />
      <HotSales />
      <Banner />
      <Footer />
    </div>
  );
};

export default Home;
