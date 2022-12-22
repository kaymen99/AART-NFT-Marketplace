// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "./interfaces/IAARTCollection.sol";

contract AARTMarket is Ownable, IERC721Receiver {
    uint256 private constant PRECISION = 1e3;
    uint256 private constant MAX_FEE = 30; // 3% is maximum trade fee

    enum ListingStatus {
        Active,
        Sold,
        Canceled
    }

    enum OfferStatus {
        Active,
        Ended
    }

    enum AuctionStatus {
        Open,
        Closed,
        Ended,
        DirectBuy,
        Canceled
    }

    struct Listing {
        uint256 tokenId;
        address seller;
        address paymentToken; // set to address(0) for MATIC
        uint256 buyPrice;
        ListingStatus status;
    }

    struct Offer {
        address offerer;
        address paymentToken; // set to address(0) for MATIC
        uint256 price;
        uint256 expireTime;
        OfferStatus status;
    }

    struct Auction {
        uint256 tokenId;
        address seller;
        address paymentToken; // set to address(0) for MATIC
        address highestBidder;
        uint256 highestBid;
        uint256 directBuyPrice;
        uint256 startPrice;
        uint128 startTime;
        uint128 endTime;
        AuctionStatus status;
    }

    Listing[] private _listings;
    Auction[] private _auctions;

    // supported ERC20 tokens
    address[] public supportedERC20tokens;
    mapping(address => bool) private _erc20Tokensmapping;

    // tokenId => offer
    mapping(uint256 => Offer[]) private _offers;

    // auctionId => user => bid amount
    mapping(uint256 => mapping(address => uint256))
        private auctionBidderAmounts;

    IAARTCollection private immutable nftContract;

    uint256 public fee = 10; // 1%

    //--------------------------------------------------------------------
    // EVENTS

    event ItemListed(uint256 listingId, address seller, uint256 tokenId);
    event ItemSold(uint256 listingId, address buyer);
    event ItemCanceled(uint256 listingId);
    event NewOffer(uint256 offerId, uint256 tokenId, address offerer);
    event OfferAccepted(uint256 offerId, uint256 tokenId, address owner);
    event OfferCanceled(uint256 offerId, uint256 tokenId);
    event AuctionStarted(
        uint256 auctionId,
        address seller,
        uint256 tokenId,
        uint256 startTime
    );
    event NewBid(uint256 auctionId, address bidder, uint256 bidAmount);
    event AuctionDirectBuy(uint256 auctionId, address buyer);
    event AuctionCanceled(uint256 auctionId);
    event AuctionEnded(uint256 auctionId, address buyer);
    event RoyaltyPaid(uint256 tokenId, address receiver, uint256 amount);
    event NewSupportedToken(address token);
    event NewFee(uint256 fee);

    //--------------------------------------------------------------------
    // ERRORS

    error AARTMarket_InvalidToken(uint256 tokenId);
    error AARTMarket_OnlyTokenOwner(uint256 tokenId);
    error AARTMarket_ItemNotApproved(uint256 tokenId);
    error AARTMarket_AddressZero();
    error AARTMarket_OnlySeller(uint256 id);
    error AARTMarket_ListingNotActive(uint256 listingId);
    error AARTMarket_OfferAmountNotApproved();
    error AARTMarket_InvalidExpirationTime();
    error AARTMarket_OfferNotActive(uint256 offerId, uint256 tokenId);
    error AARTMarket_OnlyOfferer(uint256 offerId, uint256 tokenId);
    error AARTMarket_InvalidAuctionPeriod(uint256 endTime, uint256 startTime);
    error AARTMarket_InvalidStartTime(uint256 startTime);
    error AARTMarket_InvalidStartPrice();
    error AARTMarket_InvalidDirectBuyPrice(uint256 directBuyPrice);
    error AARTMarket_AuctionNotOpen(uint256 auctionId);
    error AARTMarket_AlreadyHighestBid(uint256 auctionId);
    error AARTMarket_InsufficientBid(uint256 auctionId);
    error AARTMarket_InsufficientAmount();
    error AARTMarket_IsHighestBidder(uint256 auctionId);
    error AARTMarket_HasNoBid(uint256 auctionId);
    error AARTMarket_AuctionPeriodNotEnded(uint256 auctionId, uint256 endTime);
    error AARTMarket_CancelImpossible(uint256 auctionId);
    error AARTMarket_UnsupportedToken(address token);
    error AARTMarket_AlreadySupported(address token);
    error AARTMarket_InvalidFee(uint256 fee);
    error AARTMarket_TransferFailed();

    //--------------------------------------------------------------------
    // Modifiers

    modifier allowedToken(address token) {
        if (token != address(0)) {
            if (!_erc20Tokensmapping[token])
                revert AARTMarket_UnsupportedToken(token);
        }
        _;
    }

    constructor(address _nftAddress) {
        if (_nftAddress == address(0)) revert AARTMarket_AddressZero();
        nftContract = IAARTCollection(_nftAddress);
    }

    // ************************** //
    //      Direct Sale Logic     //
    // ************************** //

    function listItem(
        uint256 _tokenId,
        address _paymentToken,
        uint256 _buyPrice
    ) external allowedToken(_paymentToken) returns (uint256 listingId) {
        // check that the user is the owner of the token
        // also checks that token is from the AART collection
        if (nftContract.ownerOf(_tokenId) != msg.sender)
            revert AARTMarket_InvalidToken(_tokenId);
        // check that the user approved this contract to transfer token
        if (nftContract.getApproved(_tokenId) != address(this))
            revert AARTMarket_ItemNotApproved(_tokenId);

        listingId = _listings.length;

        Listing memory listingItem;
        listingItem.tokenId = _tokenId;
        listingItem.seller = msg.sender;
        listingItem.paymentToken = _paymentToken;
        listingItem.buyPrice = _buyPrice;
        listingItem.status = ListingStatus.Active;

        _listings.push(listingItem);

        emit ItemListed(listingId, msg.sender, _tokenId);
    }

    function buyItem(uint256 _listingId) external payable {
        Listing memory item = _listings[_listingId];

        if (item.status != ListingStatus.Active)
            revert AARTMarket_ListingNotActive(_listingId);

        if (item.paymentToken == address(0) && msg.value != item.buyPrice)
            revert AARTMarket_InsufficientAmount();

        // handle payment
        _handleSalePayment(
            item.tokenId,
            item.seller,
            msg.sender,
            item.paymentToken,
            item.buyPrice
        );

        // transfer nft to buyer
        nftContract.safeTransferFrom(item.seller, msg.sender, item.tokenId);

        // update listing status
        _listings[_listingId].status = ListingStatus.Sold;

        emit ItemSold(_listingId, msg.sender);
    }

    function cancelListing(uint256 _listingId) external {
        if (msg.sender != _listings[_listingId].seller)
            revert AARTMarket_OnlySeller(_listingId);
        if (_listings[_listingId].status != ListingStatus.Active)
            revert AARTMarket_ListingNotActive(_listingId);

        _listings[_listingId].status = ListingStatus.Canceled;

        emit ItemCanceled(_listingId);
    }

    // ********************** //
    //      Offers Logic      //
    // ********************** //

    function makeOffer(
        uint256 tokenId,
        address paymentToken,
        uint256 offerPrice,
        uint256 expirationTime
    ) external payable allowedToken(paymentToken) returns (uint256 offerId) {
        // revert if token does not exist in the AART collection
        _isAARTToken(tokenId);

        if (expirationTime <= block.timestamp)
            revert AARTMarket_InvalidExpirationTime();

        if (paymentToken == address(0)) {
            // can not approve MATIC so offerer is obliged to escrow offerPrice to this contract
            // the fund can be withdrawn by canceling the offer
            if (msg.value != offerPrice) revert AARTMarket_InsufficientAmount();
        } else {
            // check that the offerer has approved offerPrice amount of paymetToken to this contract
            if (
                IERC20(paymentToken).allowance(msg.sender, address(this)) <
                offerPrice
            ) revert AARTMarket_OfferAmountNotApproved();
        }

        offerId = _offers[tokenId].length;

        Offer memory offer;
        offer.offerer = msg.sender;
        offer.paymentToken = paymentToken;
        offer.price = offerPrice;
        offer.expireTime = uint128(expirationTime);
        offer.status = OfferStatus.Active;

        _offers[tokenId].push(offer);

        emit NewOffer(offerId, tokenId, msg.sender);
    }

    function acceptOffer(uint256 tokenId, uint256 offerId) external {
        Offer memory offer = _offers[tokenId][offerId];
        // check that the user is the owner of the token
        if (msg.sender != nftContract.ownerOf(tokenId))
            revert AARTMarket_OnlyTokenOwner(tokenId);

        if (_offerStatus(tokenId, offerId) != OfferStatus.Active)
            revert AARTMarket_OfferNotActive(offerId, tokenId);

        // handle payment like a normal sale
        _handleSalePayment(
            tokenId,
            msg.sender,
            offer.offerer,
            offer.paymentToken,
            offer.price
        );

        _offers[tokenId][offerId].status = OfferStatus.Ended;

        // transfer nft to this contract
        nftContract.safeTransferFrom(msg.sender, offer.offerer, tokenId);

        emit OfferAccepted(offerId, tokenId, msg.sender);
    }

    function cancelOffer(uint256 tokenId, uint256 offerId) external {
        Offer memory offer = _offers[tokenId][offerId];

        if (msg.sender != offer.offerer)
            revert AARTMarket_OnlyOfferer(offerId, tokenId);
        if (_offerStatus(tokenId, offerId) != OfferStatus.Active)
            revert AARTMarket_OfferNotActive(offerId, tokenId);

        _offers[tokenId][offerId].status = OfferStatus.Ended;

        if (offer.paymentToken == address(0)) {
            // return MATIC amount escowed when creating offer to offerer
            _sendMatic(offer.offerer, offer.price);
        }

        emit OfferCanceled(offerId, tokenId);
    }

    // ********************** //
    //      Auction Logic     //
    // ********************** //

    function startAuction(
        uint256 _tokenId,
        address _paymentToken,
        uint256 _directBuyPrice,
        uint256 _startPrice,
        uint128 _startTime,
        uint128 _endTime
    ) external allowedToken(_paymentToken) returns (uint256 auctionId) {
        // check that the user is the owner of the token
        // also checks that token is from the AART collection
        if (nftContract.ownerOf(_tokenId) != msg.sender)
            revert AARTMarket_InvalidToken(_tokenId);
        if (_endTime <= _startTime)
            revert AARTMarket_InvalidAuctionPeriod(_endTime, _startTime);
        if (_startTime < block.timestamp)
            revert AARTMarket_InvalidStartTime(_startTime);
        if (_startPrice == 0) revert AARTMarket_InvalidStartPrice();
        if (_directBuyPrice <= _startPrice)
            revert AARTMarket_InvalidDirectBuyPrice(_directBuyPrice);

        auctionId = _auctions.length;

        Auction memory _auction;
        _auction.tokenId = _tokenId;
        _auction.seller = msg.sender;
        _auction.paymentToken = _paymentToken;
        _auction.directBuyPrice = _directBuyPrice;
        _auction.startPrice = _startPrice;
        _auction.startTime = uint128(_startTime);
        _auction.endTime = uint128(_endTime);
        _auction.status = AuctionStatus.Open;

        _auctions.push(_auction);

        // transfer nft to this contract
        nftContract.safeTransferFrom(msg.sender, address(this), _tokenId);

        emit AuctionStarted(auctionId, msg.sender, _tokenId, _startTime);
    }

    function bid(uint256 _auctionId, uint256 _amount) external payable {
        Auction memory _auction = _auctions[_auctionId];

        if (_auctionStatus(_auctionId) != AuctionStatus.Open)
            revert AARTMarket_AuctionNotOpen(_auctionId);
        if (msg.sender == _auction.highestBidder)
            revert AARTMarket_AlreadyHighestBid(_auctionId);

        if (_auction.paymentToken == address(0)) {
            _amount = msg.value;
        }

        uint256 oldBidAmount = auctionBidderAmounts[_auctionId][msg.sender];
        if (_auction.highestBidder != address(0)) {
            if (oldBidAmount + _amount <= _auction.highestBid)
                revert AARTMarket_InsufficientBid(_auctionId);
        } else {
            // case of the first bid
            if (_amount < _auction.startPrice)
                revert AARTMarket_InsufficientBid(_auctionId);
        }

        if (_auction.paymentToken != address(0)) {
            IERC20(_auction.paymentToken).transferFrom(
                msg.sender,
                address(this),
                _amount
            );
        }

        auctionBidderAmounts[_auctionId][msg.sender] += _amount;

        _auctions[_auctionId].highestBidder = msg.sender;
        _auctions[_auctionId].highestBid = oldBidAmount + _amount;

        emit NewBid(_auctionId, msg.sender, oldBidAmount + _amount);
    }

    function directBuyAuction(uint256 _auctionId) external payable {
        Auction memory _auction = _auctions[_auctionId];

        if (_auctionStatus(_auctionId) != AuctionStatus.Open)
            revert AARTMarket_AuctionNotOpen(_auctionId);

        if (
            _auction.paymentToken == address(0) &&
            msg.value != _auction.directBuyPrice
        ) revert AARTMarket_InsufficientAmount();

        // handle payment
        _handleSalePayment(
            _auction.tokenId,
            _auction.seller,
            msg.sender,
            _auction.paymentToken,
            _auction.directBuyPrice
        );

        _auctions[_auctionId].status = AuctionStatus.DirectBuy;

        // transfer nft to the buyer
        nftContract.safeTransferFrom(
            address(this),
            msg.sender,
            _auction.tokenId
        );

        emit AuctionDirectBuy(_auctionId, msg.sender);
    }

    function withdrawBid(uint256 _auctionId) external {
        if (_auctionStatus(_auctionId) == AuctionStatus.Open) {
            // if auction is open don't allow highest bidder withdrawal
            if (msg.sender == _auctions[_auctionId].highestBidder)
                revert AARTMarket_IsHighestBidder(_auctionId);
        }
        uint256 bidAmount = auctionBidderAmounts[_auctionId][msg.sender];

        if (bidAmount == 0) revert AARTMarket_HasNoBid(_auctionId);

        auctionBidderAmounts[_auctionId][msg.sender] = 0;

        address _paymentToken = _auctions[_auctionId].paymentToken;
        // return bid amount to the bidder
        if (_paymentToken != address(0)) {
            IERC20(_paymentToken).transfer(msg.sender, bidAmount);
        } else {
            _sendMatic(msg.sender, bidAmount);
        }
    }

    function endAuction(uint256 _auctionId) external {
        Auction memory _auction = _auctions[_auctionId];

        if (
            _auctionStatus(_auctionId) != AuctionStatus.Ended ||
            _auction.status != AuctionStatus.Open
        ) revert AARTMarket_AuctionPeriodNotEnded(_auctionId, _auction.endTime);

        address buyer;
        if (_auction.highestBidder != address(0)) {
            buyer = _auction.highestBidder;

            // handle payment
            _handleAuctionPayment(
                _auction.tokenId,
                _auction.seller,
                _auction.paymentToken,
                _auction.highestBid
            );

            _auctions[_auctionId].status = AuctionStatus.Ended;

            // transfer nft to the highest bidder
            nftContract.safeTransferFrom(
                address(this),
                buyer,
                _auction.tokenId
            );
        } else {
            _auctions[_auctionId].status = AuctionStatus.Ended;

            // transfer nft back to the seller
            nftContract.safeTransferFrom(
                address(this),
                _auction.seller,
                _auction.tokenId
            );
        }

        emit AuctionEnded(_auctionId, buyer);
    }

    function cancelAuction(uint256 _auctionId) external {
        if (msg.sender != _auctions[_auctionId].seller)
            revert AARTMarket_OnlySeller(_auctionId);
        AuctionStatus state = _auctionStatus(_auctionId);
        if (state != AuctionStatus.Open && state != AuctionStatus.Closed)
            revert AARTMarket_CancelImpossible(_auctionId);

        _auctions[_auctionId].status = AuctionStatus.Canceled;

        // transfer nft back to seller
        nftContract.safeTransferFrom(
            address(this),
            msg.sender,
            _auctions[_auctionId].tokenId
        );

        emit AuctionCanceled(_auctionId);
    }

    // ************************ //
    //      Internal utils      //
    // ************************ //

    // this function reverts if token does not exists
    function _isAARTToken(uint256 tokenId) internal view returns (bool) {
        return nftContract.ownerOf(tokenId) != address(0);
    }

    function _sendMatic(address account, uint256 amount) internal {
        (bool success, ) = payable(account).call{value: amount}("");
        if (!success) revert AARTMarket_TransferFailed();
    }

    function _handleSalePayment(
        uint256 tokenId,
        address seller,
        address buyer,
        address paymentToken,
        uint256 salePrice
    ) internal {
        (address royaltyReceiver, uint256 royaltyAmount) = nftContract
            .royaltyInfo(tokenId, salePrice);

        uint256 feeAmount = (salePrice * fee) / PRECISION;

        if (paymentToken != address(0)) {
            // Case 1 : ERC20 payment
            if (seller != royaltyReceiver && royaltyAmount != 0) {
                // pay NFT creator royalty in ERC20 token
                IERC20(paymentToken).transferFrom(
                    buyer,
                    royaltyReceiver,
                    royaltyAmount
                );

                // pay platform fee
                IERC20(paymentToken).transferFrom(
                    buyer,
                    address(this),
                    feeAmount
                );

                uint256 finalAmount;
                unchecked {
                    finalAmount = salePrice - royaltyAmount - feeAmount;
                }
                // pay current item seller in ERC20 token
                IERC20(paymentToken).transferFrom(buyer, seller, finalAmount);

                emit RoyaltyPaid(tokenId, royaltyReceiver, royaltyAmount);
            } else {
                // pay platform fee
                IERC20(paymentToken).transferFrom(
                    buyer,
                    address(this),
                    feeAmount
                );

                uint256 finalAmount;
                unchecked {
                    finalAmount = salePrice - feeAmount;
                }
                // seller is same as NFT creator so transfer directly
                IERC20(paymentToken).transferFrom(buyer, seller, finalAmount);
            }
        } else {
            // Case 2 : Matic payment
            if (seller != royaltyReceiver && royaltyAmount != 0) {
                // pay NFT creator royalty in Matic
                _sendMatic(royaltyReceiver, royaltyAmount);

                // pay current item seller in Matic
                uint256 finalAmount;
                unchecked {
                    finalAmount = salePrice - royaltyAmount - feeAmount;
                }
                _sendMatic(seller, finalAmount);

                emit RoyaltyPaid(tokenId, royaltyReceiver, royaltyAmount);
            } else {
                uint256 finalAmount;
                unchecked {
                    finalAmount = salePrice - feeAmount;
                }
                // seller is same as NFT creator so send directly
                _sendMatic(seller, finalAmount);
            }
        }
    }

    function _handleAuctionPayment(
        uint256 tokenId,
        address seller,
        address paymentToken,
        uint256 salePrice
    ) internal {
        (address royaltyReceiver, uint256 royaltyAmount) = nftContract
            .royaltyInfo(tokenId, salePrice);

        uint256 feeAmount = (salePrice * fee) / PRECISION;

        if (paymentToken != address(0)) {
            // Case 1 : ERC20 payment
            if (seller != royaltyReceiver && royaltyAmount != 0) {
                // pay NFT creator royalty in ERC20 token
                IERC20(paymentToken).transfer(royaltyReceiver, royaltyAmount);

                uint256 finalAmount;
                unchecked {
                    finalAmount = salePrice - royaltyAmount - feeAmount;
                }
                // pay current item seller in ERC20 token
                IERC20(paymentToken).transfer(seller, finalAmount);

                emit RoyaltyPaid(tokenId, royaltyReceiver, royaltyAmount);
            } else {
                uint256 finalAmount;
                unchecked {
                    finalAmount = salePrice - feeAmount;
                }
                // seller is same as NFT creator so transfer directly
                IERC20(paymentToken).transfer(seller, finalAmount);
            }
        } else {
            // Case 2 : Matic payment
            if (seller != royaltyReceiver && royaltyAmount != 0) {
                // pay NFT creator royalty in Matic
                _sendMatic(royaltyReceiver, royaltyAmount);

                uint256 finalAmount;
                unchecked {
                    finalAmount = salePrice - royaltyAmount - feeAmount;
                }

                // pay current item seller in Matic
                _sendMatic(seller, finalAmount);

                emit RoyaltyPaid(tokenId, royaltyReceiver, royaltyAmount);
            } else {
                uint256 finalAmount;
                unchecked {
                    finalAmount = salePrice - feeAmount;
                }

                // seller is same as NFT creator so send directly
                _sendMatic(seller, finalAmount);
            }
        }
    }

    function _offerStatus(uint256 tokenId, uint256 offerId)
        internal
        view
        returns (OfferStatus)
    {
        Offer memory offer = _offers[tokenId][offerId];
        if (block.timestamp > offer.expireTime) {
            return OfferStatus.Ended;
        } else {
            return offer.status;
        }
    }

    function _auctionStatus(uint256 auctionId)
        internal
        view
        returns (AuctionStatus)
    {
        Auction memory auction = _auctions[auctionId];
        if (
            auction.status == AuctionStatus.Canceled ||
            auction.status == AuctionStatus.DirectBuy
        ) {
            return auction.status;
        } else if (auction.startTime > block.timestamp) {
            return AuctionStatus.Closed;
        } else if (block.timestamp <= auction.endTime) {
            return AuctionStatus.Open;
        } else {
            return AuctionStatus.Ended;
        }
    }

    // ***************** //
    //      Getters      //
    // ***************** //

    function getNFTCollection() external view returns (address) {
        return address(nftContract);
    }

    function getListings() external view returns (Listing[] memory) {
        return _listings;
    }

    function getAuctions() external view returns (Auction[] memory) {
        return _auctions;
    }

    function getSupportedTokens() external view returns (address[] memory) {
        return supportedERC20tokens;
    }

    function getTokenBuyOffers(uint256 tokenId)
        external
        view
        returns (Offer[] memory)
    {
        return _offers[tokenId];
    }

    function getUserBidAmount(uint256 auctionId, address account)
        external
        view
        returns (uint256)
    {
        return auctionBidderAmounts[auctionId][account];
    }

    function onERC721Received(
        address,
        address,
        uint256,
        bytes calldata
    ) external pure override returns (bytes4) {
        return IERC721Receiver.onERC721Received.selector;
    }

    // ********************** //
    //     Owner functions    //
    // ********************** //

    function setFee(uint256 _fee) external onlyOwner {
        if (_fee > MAX_FEE) revert AARTMarket_InvalidFee(_fee);
        fee = _fee;

        emit NewFee(_fee);
    }

    function addSupportedToken(address _token) external onlyOwner {
        if (_erc20Tokensmapping[_token]) revert AARTMarket_AlreadySupported(_token);
        _erc20Tokensmapping[_token] = true;
        supportedERC20tokens.push(_token);

        emit NewSupportedToken(_token);
    }
}
