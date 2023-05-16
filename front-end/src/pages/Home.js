import React from "react";
import "../assets/styles/pages/home.css";
import {
  Hero,
  Services,
  AuctionSlider,
  HotSales,
  Banner,
  Sellers,
} from "../components";

const Home = () => {
  return (
    <div>
      <Hero />
      <Services />
      <AuctionSlider />
      <Sellers />
      <HotSales />
      <Banner />
    </div>
  );
};

export default Home;
