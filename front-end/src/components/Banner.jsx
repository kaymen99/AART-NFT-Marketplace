import React from "react";
import { Link } from "react-router-dom";

//INTERNAL IMPORT
import "../assets/styles/components/Banner.css";
import images from "../assets/images";
import Button from "./Button";

const Banner = () => {
  return (
    <div className="banner section__padding">
      <div className="banner-content">
        <div className="banner-box">
          <h1>Earn free crypto with Ciscrypt</h1>
          <p>A creative agency that lead and inspire.</p>

          <div className="banner-box-btn">
            <Link to="/create-nft">
              <Button btnName="Create" />
            </Link>
            <Link to="/collection">
              <Button btnName="Discover" />
            </Link>
          </div>
        </div>

        <img className="shake-vertical" src={images.coin} alt="" />
      </div>
    </div>
    // <div className={Style.Brand}>
    //   <div className={Style.Brand_box}>
    //     <div className={Style.Brand_box_left}>
    //       <h1>Earn free crypto with Ciscrypt</h1>
    //       <p>A creative agency that lead and inspire.</p>

    //       <div className={Style.Brand_box_left_btn}>
    //         <Button btnName="Create" />
    //         <Button btnName="Discover" />
    //       </div>
    //     </div>
    //     <div className={Style.Brand_box_right}>
    //       <img src={images.earn} alt="brand logo" width={400} height={300} />
    //     </div>
    //   </div>
    // </div>
  );
};

export default Banner;
