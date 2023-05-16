import React, { useCallback, useState } from "react";
import "./../assets/styles/components/Sellers.css";
import "swiper/css";
import "swiper/css/free-mode";
import images from "../assets/images";

import { TbArrowBigLeftLines, TbArrowBigRightLine } from "react-icons/tb";
import { Link } from "react-router-dom";
import { Swiper, SwiperSlide } from "swiper/react";
import { FreeMode } from "swiper";

const Sellers = () => {
  const [swiperRef, setSwiperRef] = useState();

  const handlePrevious = useCallback(() => {
    swiperRef?.slidePrev();
  }, [swiperRef]);

  const handleNext = useCallback(() => {
    swiperRef?.slideNext();
  }, [swiperRef]);

  return (
    <div className="sellers section__padding">
      <h1 className="listing-title">Top Sellers</h1>
      <div className="sellers-slider">
        <TbArrowBigLeftLines size={28} onClick={() => handlePrevious()} />
        <Swiper
          modules={[FreeMode]}
          onSwiper={setSwiperRef}
          className="mySwiper"
          breakpoints={{
            0: {
              slidesPerView: 1,
              spaceBetween: 1,
            },
            390: {
              slidesPerView: 2,
              spaceBetween: 5,
            },
            640: {
              slidesPerView: 3,
              spaceBetween: 5,
            },
            860: {
              slidesPerView: 4,
              spaceBetween: 5,
            },
            1100: {
              slidesPerView: 5,
              spaceBetween: 0,
            },
          }}
        >
          <SwiperSlide>
            <div className="slider-card">
              <p className="slider-card-number">1</p>
              <div className="slider-img">
                <img src={images.user} alt="" />
              </div>
              <Link to={`/profile/Rian`}>
                <p className="slider-card-name">James Bond</p>
              </Link>
              <p className="slider-card-price">
                5.250 <span>ETH</span>
              </p>
            </div>
          </SwiperSlide>
          <SwiperSlide>
            <div className="slider-card">
              <p className="slider-card-number">2</p>
              <div className="slider-img">
                <img src={images.user} alt="" />
              </div>
              <Link to={`/profile/Rian`}>
                <p className="slider-card-name">Rian Leon</p>
              </Link>
              <p className="slider-card-price">
                4.932 <span>ETH</span>
              </p>
            </div>
          </SwiperSlide>
          <SwiperSlide>
            <div className="slider-card">
              <p className="slider-card-number">3</p>
              <div className="slider-img">
                <img src={images.user} alt="" />
              </div>
              <Link to={`/profile/Rian`}>
                <p className="slider-card-name">Lady Young</p>
              </Link>
              <p className="slider-card-price">
                4.620 <span>ETH</span>
              </p>
            </div>
          </SwiperSlide>
          <SwiperSlide>
            <div className="slider-card">
              <p className="slider-card-number">4</p>
              <div className="slider-img">
                <img src={images.user} alt="" />
              </div>
              <Link to={`/profile/Rian`}>
                <p className="slider-card-name">Black Glass</p>
              </Link>
              <p className="slider-card-price">
                4.125 <span>ETH</span>
              </p>
            </div>
          </SwiperSlide>
          <SwiperSlide>
            <div className="slider-card">
              <p className="slider-card-number">5</p>
              <div className="slider-img">
                <img src={images.user} alt="" />
              </div>
              <Link to={`/profile/Rian`}>
                <p className="slider-card-name">Budhiman</p>
              </Link>
              <p className="slider-card-price">
                3.921 <span>ETH</span>
              </p>
            </div>
          </SwiperSlide>
          <SwiperSlide>
            <div className="slider-card">
              <p className="slider-card-number">6</p>
              <div className="slider-img">
                <img src={images.user} alt="" />
              </div>
              <Link to={`/profile/Rian`}>
                <p className="slider-card-name">Alex</p>
              </Link>
              <p className="slider-card-price">
                3.548 <span>ETH</span>
              </p>
            </div>
          </SwiperSlide>
        </Swiper>
        <TbArrowBigRightLine size={28} onClick={() => handleNext()} />
      </div>
    </div>
  );
};

export default Sellers;
