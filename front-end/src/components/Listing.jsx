import "./../assets/styles/components/Listing.css";
import React from "react";
import { AiFillHeart } from "react-icons/ai";

const Listing = ({ items }) => {
  return (
    <div className="item-container-card">
      {items.map((item, i) => {
        return (
          <div className="card-column" key={i}>
            <div className="item-card">
              <div className="item-card-top">
                <img src={item.uri} alt="" />
                <a href={`/${item.path}/${item.id}`}>
                  <p className="card-title">{item.name}</p>
                </a>
              </div>
              <div className="item-card-bottom">
                <p>
                  {item.price} <span>ETH</span>
                </p>
                <p>
                  {" "}
                  <AiFillHeart /> {92}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default Listing;
