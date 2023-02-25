import React from "react";
import "../assets/styles/pages/home.css";
import {
  NavBar,
  Banner,
  Services,
  AuctionSlider,
  HotSales,
  Footer,
} from "../components";

const Home = () => {
  return (
    <div className="home">
      <NavBar />
      <Banner />
      <Services />
      {/* <Sellers /> */}
      <AuctionSlider />
      <HotSales />
      <Footer />
    </div>
  );
};

export default Home;
