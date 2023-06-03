import React from "react";
import { Link } from "react-router-dom";
import "../assets/styles/components/Banner.css";
import images from "../assets/images";
import Button from "./Button";

const Banner = () => {
  return (
    <div className="banner section__padding">
      <div className="banner-content">
        <div className="banner-box">
          <h1>Start Your Journey Into AI Art</h1>
          <p>Join our community and unleash the power of AI-infused art</p>

          <div className="banner-box-btn">
            <Link to="/register">
              <Button btnName="Register" />
            </Link>
            <Link to="/create-nft">
              <Button btnName="Create" />
            </Link>
          </div>
        </div>

        <img className="shake-vertical" src={images.banner} alt="" />
      </div>
    </div>
  );
};

export default Banner;
