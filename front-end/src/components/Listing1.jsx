import "./../assets/styles/components/Listing.css";
import React from "react";
import { AiFillHeart } from "react-icons/ai";

const Listing1 = ({ items }) => {
  return (
    <div className="item-container-card">
      {items.map((item, i) => {
        return (
          <div className="card-column" key={i}>
            <div className="item-card">
              <img src={item.uri} alt="" />
              <div className="item-card-bottom-1">
                <a href={`/${item.path}/${item.id}`}>
                  <h3 className="card-title">{item.name}</h3>
                </a>
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

export default Listing1;
