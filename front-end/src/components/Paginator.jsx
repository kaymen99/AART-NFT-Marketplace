import React, { useState, useEffect } from "react";
import "./../assets/styles/components/Paginator.css";
import Pagination from "@mui/material/Pagination";

const itemPerPage = 6;

const Paginator = ({ itemsLength, setShownItems }) => {
  const [pages, setPages] = useState({
    count: 0,
    from: 0,
    to: itemPerPage,
  });

  const handlePaginate = (event, page) => {
    const from = (page - 1) * itemPerPage;
    const to = (page - 1) * itemPerPage + itemPerPage;

    setPages({ ...pages, from: from, to: to });
  };

  useEffect(() => {
    setShownItems({ from: pages.from, to: pages.to });
  }, [pages.from, pages.to]);

  return (
    <div className="paginate">
      <Pagination
        count={Math.ceil(itemsLength / itemPerPage)}
        onChange={handlePaginate}
        variant="outlined"
        color="secondary"
      />
    </div>
  );
};

export default Paginator;
