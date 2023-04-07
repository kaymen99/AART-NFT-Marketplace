import React from "react";
import "../assets/styles/pages/home.css";
import { Hero, Services, AuctionSlider, HotSales, Banner } from "../components";

const Home = () => {
  return (
    <div>
      <Hero />
      <Services />
      {/* <Sellers /> */}
      <AuctionSlider />
      <HotSales />
      <Banner />
    </div>
  );
};

export default Home;
