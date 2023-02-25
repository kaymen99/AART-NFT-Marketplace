import React, { useState, useCallback } from "react";
import "../assets/styles/components/AuctionSlider.css";
import images from "../assets/images";
import { AiFillHeart } from "react-icons/ai";
import { MdTimer } from "react-icons/md";
import { TbArrowBigLeftLines, TbArrowBigRightLine } from "react-icons/tb";

const AuctionSlider = () => {
  const [idNumber, setIdNumber] = useState(0);

  const sliderData = [
    {
      title: "NFT 1",
      id: 1,
      name: "Aymen",
      price: "00664 ETH",
      like: 243,
      image: images.user,
      nftImage: images.nft1,
      time: {
        days: 21,
        hours: 40,
        minutes: 81,
        seconds: 15,
      },
    },
    {
      title: "NFT 2",
      id: 2,
      name: "Elon Musk",
      price: "0000004 ETH",
      like: 243,
      image: images.user,
      nftImage: images.nft2,
      time: {
        days: 77,
        hours: 11,
        minutes: 21,
        seconds: 45,
      },
    },
    {
      title: "NFT 3",
      id: 3,
      name: "John",
      price: "0000064 ETH",
      like: 243,
      image: images.user,
      nftImage: images.nft3,
      time: {
        days: 37,
        hours: 20,
        minutes: 11,
        seconds: 55,
      },
    },
    {
      title: "NFT 4",
      id: 4,
      name: "Marc",
      price: "4664 ETH",
      like: 243,
      image: images.user,
      nftImage: images.nft4,
      time: {
        days: 87,
        hours: 29,
        minutes: 10,
        seconds: 15,
      },
    },
  ];

  const inc = useCallback(() => {
    if (idNumber + 1 < sliderData.length) {
      setIdNumber(idNumber + 1);
    }
  }, [idNumber, sliderData.length]);

  const dec = useCallback(() => {
    if (idNumber > 0) {
      setIdNumber(idNumber - 1);
    }
  }, [idNumber]);

  return (
    <div className="section__padding">
      <div className="listing-container">
        <div className="listing-title" style={{ paddingTop: "50px" }}>
          <h1>Live Auctions</h1>
        </div>
        <div>
          <div className="auction-slider-box">
            <div className="auction-slider-box-left">
              <h2>{sliderData[idNumber].title}</h2>
              <div className="auction-slider-seller">
                <div className="auction-slider-seller-profile">
                  <img
                    className="auction-slider-seller-img"
                    src={sliderData[idNumber].image}
                    alt="profile image"
                  />
                  <div className="auction-slider-seller-info">
                    <p>Creator</p>
                    <br />
                    <h4>{sliderData[idNumber].name} </h4>
                  </div>
                </div>
              </div>
              <div className="auction-slider-box-left-bidding">
                <div className="auction-slider-bidding-box">
                  <small>Current Bid</small>
                  <p>
                    {sliderData[idNumber].price} <span>$221,21</span>
                  </p>
                </div>

                <p className="auction-slider-bidding-info">
                  <MdTimer className="auction-slider-bidding-icon" />
                  <span>Auction ending in</span>
                </p>

                <div className="auction-slider-bidding-timer">
                  <div className="auction-slider-timer-item">
                    <p>{sliderData[idNumber].time.days}</p>
                    <span>Days</span>
                  </div>

                  <div className="auction-slider-timer-item">
                    <p>{sliderData[idNumber].time.hours}</p>
                    <span>Hours</span>
                  </div>

                  <div className="auction-slider-timer-item">
                    <p>{sliderData[idNumber].time.minutes}</p>
                    <span>mins</span>
                  </div>

                  <div className="auction-slider-timer-item">
                    <p>{sliderData[idNumber].time.seconds}</p>
                    <span>secs</span>
                  </div>
                </div>

                <div className="mint-btn">
                  <button btnName="Place" handleClick={() => {}}>
                    Place
                  </button>
                  <button btnName="View" handleClick={() => {}}>
                    View
                  </button>
                </div>
              </div>

              <div className="auction-slider-button">
                <TbArrowBigLeftLines
                  className="auction-slider-button-icon"
                  onClick={() => dec()}
                />
                <TbArrowBigRightLine
                  className="auction-slider-button-icon"
                  onClick={() => inc()}
                />
              </div>
            </div>

            <div className="auction-slider-box-right">
              <div className="auction-slider_box_right_box">
                <img
                  className="auction_slider_box_right_box_img"
                  src={sliderData[idNumber].nftImage}
                  alt="NFT IMAGE"
                />

                <div className="auction_slider_box_right_box_like">
                  <AiFillHeart />
                  <span>{sliderData[idNumber].like}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuctionSlider;
