import React, { useState } from "react";
import "../assets/styles/pages/profilePage.css";
import images from "../assets/images";
import { Listing, Paginator } from "../components";

const ProfilePage = () => {
  return (
    <>
      {/* <div className="profile section__padding">
        <div className="profile-top">
          <div className="profile-banner">
            <img src={profile_banner} alt="banner" />
          </div>
          <div className="profile-pic">
            <img src={profile_pic} alt="profile" />
            <h3>James Bond</h3>
          </div>
        </div>
        <div className="profile-bottom">
          <div className="profile-bottom-input">
            <input type="text" placeholder="Search Item here" />
            <select>
              <option>Created</option>
              <option>In Sale</option>
              <option>Owned</option>
            </select>
          </div>
        </div>
        <br />
        <div className="bids-container">
          <Listing items={sales} />
        </div>
        <Paginator items={items} setItems={setSales} />
      </div> */}
    </>
  );
};

export default ProfilePage;
