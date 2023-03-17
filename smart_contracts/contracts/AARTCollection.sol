// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "./interfaces/IArtists.sol";

contract AARTCollection is ERC721URIStorage, ERC2981, Ownable {
    //--------------------------------------------------------------------
    // VARIABLES

    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;

    // USE uint256 instead of bool to save gas
    // paused = 1 && active = 2
    uint256 public paused = 1;

    // mint fee in MATIC
    uint256 public mintFee = 10;

    // AART artists profile nft contract
    address public immutable artistsNftContract;

    mapping(uint256 => string) private _tokenURIs;

    struct ArtRender {
        uint256 id;
        string uri;
    }

    //--------------------------------------------------------------------
    // EVENTS

    event AART__Pause(uint256 state);
    event AART__NewMintFee(uint256 newFee);

    //--------------------------------------------------------------------
    // ERRORS

    error AART__ContractIsPaused();
    error AART__InsufficientAmount();
    error AART__OnlyRegisteredUser();

    constructor(
        address _artistsNftContract,
        uint256 _mintingFee
    ) ERC721("Artifciel Art Collectible", "AART") {
        artistsNftContract = _artistsNftContract;
        mintFee = _mintingFee;

        // default royalty == 0%
        _setDefaultRoyalty(msg.sender, 0);
    }

    // ************************ //
    //      Main Functions      //
    // ************************ //

    function mintNFT(
        address recipient,
        string memory uri
    ) external payable returns (uint256) {
        return _mintNFT(recipient, uri);
    }

    function mintWithRoyalty(
        address recipient,
        string memory uri,
        address royaltyReceiver,
        uint96 feeNumerator
    ) external payable returns (uint256) {
        uint256 tokenId = _mintNFT(recipient, uri);
        _setTokenRoyalty(tokenId, royaltyReceiver, feeNumerator);

        return tokenId;
    }

    function _mintNFT(
        address recipient,
        string memory uri
    ) internal returns (uint256) {
        if (paused == 1) revert AART__ContractIsPaused();
        if (!IArtists(artistsNftContract).hasProfile(msg.sender))
            revert AART__OnlyRegisteredUser();
        if (msg.value != mintFee) revert AART__InsufficientAmount();

        uint256 tokenId = _tokenIds.current();
        _tokenIds.increment();

        _safeMint(recipient, tokenId);
        _setTokenURI(tokenId, uri);

        return tokenId;
    }

    function supportsInterface(
        bytes4 interfaceId
    ) public view virtual override(ERC721, ERC2981) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    function _burn(uint256 tokenId) internal virtual override {
        super._burn(tokenId);
        _resetTokenRoyalty(tokenId);
    }

    function _setTokenURI(
        uint256 tokenId,
        string memory _tokenURI
    ) internal override {
        _tokenURIs[tokenId] = _tokenURI;
    }

    // ***************** //
    //      Getters      //
    // ***************** //

    function tokenURI(
        uint256 tokenId
    ) public view virtual override returns (string memory) {
        return _tokenURIs[tokenId];
    }

    function getAllNfts() external view returns (ArtRender[] memory) {
        uint256 lastestId = _tokenIds.current();
        ArtRender[] memory items = new ArtRender[](lastestId);
        for (uint256 i; i < lastestId; ) {
            string memory uri = _tokenURIs[i];
            items[i] = ArtRender(i, uri);

            unchecked {
                ++i;
            }
        }
        return items;
    }

    function getUserNfts(
        address account
    ) external view returns (ArtRender[] memory) {
        uint256 lastestId = _tokenIds.current();
        uint256 nftsCount = balanceOf(account);

        ArtRender[] memory items = new ArtRender[](nftsCount);

        uint256 counter;
        for (uint256 i; i < lastestId; ) {
            if (ownerOf(i) == account) {
                string memory uri = _tokenURIs[i];
                items[counter] = ArtRender(i, uri);
                counter++;
            }
            unchecked {
                ++i;
            }
        }
        return items;
    }

    // ******************* //
    //      Owner only     //
    // ******************* //

    function pause(uint256 _state) external payable onlyOwner {
        if (_state == 1 || _state == 2) paused = _state;
        emit AART__Pause(_state);
    }

    function setMintFee(uint256 _newFee) external payable onlyOwner {
        mintFee = _newFee;
        emit AART__NewMintFee(_newFee);
    }

    function withdraw() external payable onlyOwner {
        (bool success, ) = payable(msg.sender).call{value: address(this).balance}(
            ""
        );
        require(success);
    }
}
