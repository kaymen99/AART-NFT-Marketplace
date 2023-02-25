import React from "react";
import "./../assets/styles/components/Footer.css";
import { AiOutlineTwitter, AiOutlineGithub } from "react-icons/ai";
import { RiDiscordFill } from "react-icons/ri";

function Footer() {
  return (
    <div className="footer container">
      <p>AART&#169; All Right Reserved</p>
      <div className="social">
        <a href="https://github.com/Aymen1001">
          <AiOutlineGithub size={20} color="#fff" />
        </a>
        <a href="https://github.com/Aymen1001">
          <AiOutlineTwitter size={20} color="#fff" />
        </a>
        <a href="https://github.com/Aymen1001">
          <RiDiscordFill size={20} color="#fff" />
        </a>
      </div>
    </div>
  );
}

export default Footer;
