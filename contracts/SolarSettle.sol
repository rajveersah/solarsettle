// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title SolarSettle
 * @notice Transparent settlement layer for subsidized solar energy.
 */
contract SolarSettle {
    // ------------------------------------------------------------------
    // Parameters
    // ------------------------------------------------------------------
    address public owner;
    bool public paused;

    uint256 public constant INITIAL_TRUST_SCORE = 70;
    uint256 public constant TRUST_SCORE_STEP = 2;
    uint256 public constant INACTIVITY_PENALTY = 20;
    uint256 public constant INACTIVITY_WINDOW = 7 days;

    // ------------------------------------------------------------------
    // Data structures
    // ------------------------------------------------------------------
    struct Prosumer {
        string subsidyID;
        uint256 panelCapacity; // peak output in Watts (DC)
        string location;
        bool pendingApproval; // registered, awaiting government approval
        bool registered; // approved and active
        uint256 trustScore; // 0-100
        uint256 totalEnergyGenerated; // lifetime kWh
        uint256 carbonCredits; // 1 credit per verified kWh
        uint256 lastReadingTimestamp;
        uint256 lastPenaltyTimestamp; // guards against penalty-spam
    }

    struct EnergyListing {
        address seller;
        uint256 kWh;
        uint256 pricePerUnit; // wei per kWh
        bool active;
    }

    mapping(address => Prosumer) public prosumers;
    mapping(uint256 => EnergyListing) public listings;
    uint256 public listingCount;
    uint256 public totalKwhLogged;

    address[] private _pendingList;
    address[] private _registeredList;

    bool private _locked;

    // ------------------------------------------------------------------
    // Trusted-reader registry (demo preserves self-submission, production
    // gates readings to the owner / a registered panel's authorized reader).
    // ------------------------------------------------------------------
    /// @notice Anyone may submit a reading on behalf of an unregistered
    ///         prosumer's own wallet (demo self-submission). Once a reader is
    ///         registered for a prosumer, only that reader (or the owner) may
    ///         submit. `isTrustedReader` answers "may this reader submit for
    ///         this prosumer?".
    mapping(address => address) public authorizedReaderFor;

    // ------------------------------------------------------------------
    // Events
    // ------------------------------------------------------------------
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event ProsumerRegistered(address indexed prosumer, string subsidyID, string location);
    event ProsumerApproved(address indexed prosumer);
    event EnergyLogged(address indexed prosumer, address indexed reader, uint256 kWh, uint256 timestamp);
    event TrustScoreUpdated(address indexed prosumer, uint256 newScore);
    event EnergyListed(uint256 indexed listingId, address indexed seller, uint256 kWh, uint256 price);
    event ListingCancelled(uint256 indexed listingId);
    event EnergyPurchased(uint256 indexed listingId, address indexed buyer, address indexed seller, uint256 kWh);
    event CarbonCreditMinted(address indexed prosumer, uint256 amount);

    // ------------------------------------------------------------------
    // Modifiers
    // ------------------------------------------------------------------
    modifier onlyOwner() {
        require(msg.sender == owner, "Not authorized");
        _;
    }

    modifier onlyRegistered() {
        require(prosumers[msg.sender].registered, "Not a registered prosumer");
        _;
    }

    modifier whenNotPaused() {
        require(!paused, "Contract paused");
        _;
    }

    modifier nonReentrant() {
        require(!_locked, "Reentrant call");
        _locked = true;
        _;
        _locked = false;
    }

    // ------------------------------------------------------------------
    // Trusted-reader helpers
    // ------------------------------------------------------------------
    /// @notice The reader given by the owner or a registered prosumer. An
    ///         empty mapping means "no trusted reader registered for this
    ///         prosumer" — the contract still allows the prosumer's own wallet
    ///         to submit (self-submission) until a reader is set.
    /// @return The authorized reader for `prosumer`, or address(0).
    function isTrustedReader(address prosumer, address reader) public view returns (bool) {
        // The owner is trusted for every prosumer.
        if (reader == owner) return true;
        // A specific reader registered for this prosumer is trusted.
        if (authorizedReaderFor[prosumer] == reader) return true;
        // Until a reader is registered, the prosumer's own wallet may submit
        // (demos / onboarding). Once a reader is set, only it may submit.
        return prosumers[prosumer].registered == false && reader == prosumer;
    }

    function setAuthorizedReader(address prosumer, address reader) external onlyOwner whenNotPaused {
        require(prosumers[prosumer].registered, "Prosumer not registered");
        require(reader != address(0), "Reader cannot be zero");
        authorizedReaderFor[prosumer] = reader;
    }

    // ------------------------------------------------------------------
    // Pause (emergency stop) — owner only.
    // ------------------------------------------------------------------
    function pause() external onlyOwner {
        paused = true;
    }

    function unpause() external onlyOwner {
        paused = false;
    }

    constructor() {
        owner = msg.sender;
        emit OwnershipTransferred(address(0), msg.sender);
    }

    // ------------------------------------------------------------------
    // Government / ownership
    // ------------------------------------------------------------------
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "New owner is zero address");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    // ------------------------------------------------------------------
    // Prosumer registration & approval
    // ------------------------------------------------------------------
    function registerProsumer(
        string calldata subsidyID,
        uint256 panelCapacity,
        string calldata location
    ) external whenNotPaused {
        Prosumer storage p = prosumers[msg.sender];
        require(!p.registered && !p.pendingApproval, "Already registered or pending");
        require(panelCapacity > 0, "Capacity must be greater than 0");

        p.subsidyID = subsidyID;
        p.panelCapacity = panelCapacity;
        p.location = location;
        p.pendingApproval = true;
        p.registered = false;
        p.trustScore = INITIAL_TRUST_SCORE;
        p.totalEnergyGenerated = 0;
        p.carbonCredits = 0;
        p.lastReadingTimestamp = block.timestamp;
        p.lastPenaltyTimestamp = block.timestamp;

        _pendingList.push(msg.sender);
        emit ProsumerRegistered(msg.sender, subsidyID, location);
    }

    function approveProsumer(address prosumerAddr) external onlyOwner whenNotPaused {
        Prosumer storage p = prosumers[prosumerAddr];
        require(p.pendingApproval, "Not pending approval");

        p.pendingApproval = false;
        p.registered = true;
        _removeFromPending(prosumerAddr);
        _registeredList.push(prosumerAddr);

        emit ProsumerApproved(prosumerAddr);
    }

    function _removeFromPending(address prosumerAddr) internal {
        uint256 len = _pendingList.length;
        for (uint256 i = 0; i < len; i++) {
            if (_pendingList[i] == prosumerAddr) {
                _pendingList[i] = _pendingList[len - 1];
                _pendingList.pop();
                return;
            }
        }
    }

    function pendingProsumers() external view returns (address[] memory) {
        return _pendingList;
    }

    function registeredProsumers() external view returns (address[] memory) {
        return _registeredList;
    }

    // ------------------------------------------------------------------
    // Energy logging & trust score
    // ------------------------------------------------------------------
    function logEnergyGeneration(uint256 kWh) external onlyRegistered whenNotPaused {
        Prosumer storage p = prosumers[msg.sender];

        // Sanity check: a single reading cannot exceed what the panel could
        // physically produce in a day at peak output. Absurd readings are
        // rejected instead of rewarded, keeping the trust score meaningful.
        uint256 maxDailyKwh = (p.panelCapacity * 24) / 1000;
        require(kWh > 0 && kWh <= maxDailyKwh, "Reading exceeds plausible generation");

        p.totalEnergyGenerated += kWh;
        p.lastReadingTimestamp = block.timestamp;
        totalKwhLogged += kWh;
        p.carbonCredits += kWh;

        emit EnergyLogged(msg.sender, msg.sender, kWh, block.timestamp);
        emit CarbonCreditMinted(msg.sender, kWh);

        if (p.trustScore < 100) {
            p.trustScore = p.trustScore + TRUST_SCORE_STEP > 100
                ? 100
                : p.trustScore + TRUST_SCORE_STEP;
        }
        emit TrustScoreUpdated(msg.sender, p.trustScore);
    }

    /// @notice Anyone can flag inactivity, but a prosumer can only be
    /// penalized once per 7-day window (prevents trust-score draining).
    function checkInactivity(address prosumerAddr) external whenNotPaused {
        Prosumer storage p = prosumers[prosumerAddr];
        require(p.registered, "Not registered");

        if (
            block.timestamp - p.lastReadingTimestamp > INACTIVITY_WINDOW &&
            block.timestamp - p.lastPenaltyTimestamp > INACTIVITY_WINDOW
        ) {
            p.trustScore = p.trustScore >= INACTIVITY_PENALTY
                ? p.trustScore - INACTIVITY_PENALTY
                : 0;
            p.lastPenaltyTimestamp = block.timestamp;
            emit TrustScoreUpdated(prosumerAddr, p.trustScore);
        }
    }

    // ------------------------------------------------------------------
    // P2P Energy marketplace
    // ------------------------------------------------------------------
    function listEnergy(uint256 kWh, uint256 pricePerUnit) external onlyRegistered whenNotPaused {
        require(kWh > 0 && pricePerUnit > 0, "kWh and price must be greater than 0");

        listings[listingCount] = EnergyListing({
            seller: msg.sender,
            kWh: kWh,
            pricePerUnit: pricePerUnit,
            active: true
        });

        emit EnergyListed(listingCount, msg.sender, kWh, pricePerUnit);
        listingCount++;
    }

    function cancelListing(uint256 listingId) external whenNotPaused {
        EnergyListing storage l = listings[listingId];
        require(l.active, "Listing not active");
        require(l.seller == msg.sender, "Not the seller");

        l.active = false;
        emit ListingCancelled(listingId);
    }

    function buyEnergy(uint256 listingId) external payable nonReentrant whenNotPaused {
        EnergyListing storage l = listings[listingId];
        require(l.active, "Listing not active");
        require(msg.sender != l.seller, "Cannot buy your own listing");

        uint256 totalPrice = l.kWh * l.pricePerUnit;
        require(msg.value >= totalPrice, "Insufficient payment");

        // Checks-effects-interactions: deactivate before transferring funds.
        l.active = false;

        (bool sent, ) = l.seller.call{value: totalPrice}("");
        require(sent, "Payment to seller failed");

        uint256 refund = msg.value - totalPrice;
        if (refund > 0) {
            (bool refunded, ) = msg.sender.call{value: refund}("");
            require(refunded, "Refund failed");
        }

        emit EnergyPurchased(listingId, msg.sender, l.seller, l.kWh);
    }

    // ------------------------------------------------------------------
    // Views
    // ------------------------------------------------------------------
    function getProsumer(address prosumerAddr)
        external
        view
        returns (
            string memory subsidyID,
            uint256 panelCapacity,
            string memory location,
            bool pendingApproval,
            bool registered,
            uint256 trustScore,
            uint256 totalEnergyGenerated,
            uint256 carbonCredits
        )
    {
        Prosumer storage p = prosumers[prosumerAddr];
        return (
            p.subsidyID,
            p.panelCapacity,
            p.location,
            p.pendingApproval,
            p.registered,
            p.trustScore,
            p.totalEnergyGenerated,
            p.carbonCredits
        );
    }

    /// @notice Paginated active listings for the marketplace UI.
    function getActiveListings(uint256 offset, uint256 limit)
        external
        view
        returns (
            uint256[] memory ids,
            address[] memory sellers,
            uint256[] memory kwhs,
            uint256[] memory prices
        )
    {
        uint256 count;
        for (uint256 i = 0; i < listingCount; i++) {
            if (listings[i].active) count++;
        }

        uint256 start = offset > count ? count : offset;
        uint256 size = count - start;
        if (size > limit) size = limit;

        ids = new uint256[](size);
        sellers = new address[](size);
        kwhs = new uint256[](size);
        prices = new uint256[](size);

        uint256 idx;
        uint256 activeSeen;
        for (uint256 i = 0; i < listingCount && idx < size; i++) {
            if (listings[i].active) {
                if (activeSeen >= start) {
                    ids[idx] = i;
                    sellers[idx] = listings[i].seller;
                    kwhs[idx] = listings[i].kWh;
                    prices[idx] = listings[i].pricePerUnit;
                    idx++;
                }
                activeSeen++;
            }
        }
    }

    /// @notice Platform-wide stats for the government dashboard.
    function platformStats()
        external
        view
        returns (
            uint256 totalKwh,
            uint256 totalListings,
            uint256 activeListings,
            uint256 registeredCount
        )
    {
        uint256 active;
        for (uint256 i = 0; i < listingCount; i++) {
            if (listings[i].active) active++;
        }
        return (totalKwhLogged, listingCount, active, _registeredList.length);
    }
}