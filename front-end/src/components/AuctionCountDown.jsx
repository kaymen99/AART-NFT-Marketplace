import "../assets/styles/pages/auctionPage.css";
import Countdown from "react-countdown";

function AuctionCountDown(props) {
  const format = (num) => {
    return num.toLocaleString("en-US", {
      minimumIntegerDigits: 2,
      useGrouping: false,
    });
  };

  const renderer = ({ days, hours, minutes, seconds, completed }) => {
    if (completed) {
      return <></>;
    } else {
      return (
        <div className="auction-timer">
          <div className="auction-timer-item">
            <p>{format(days)}</p>
            <span>Days</span>
          </div>

          <div className="auction-timer-item">
            <p>{format(hours)}</p>
            <span>Hours</span>
          </div>

          <div className="auction-timer-item">
            <p>{format(minutes)}</p>
            <span>mins</span>
          </div>

          <div className="auction-timer-item">
            <p>{format(seconds)}</p>
            <span>secs</span>
          </div>
        </div>
      );
    }
  };

  return <Countdown date={props.date} renderer={renderer} />;
}

export default AuctionCountDown;
