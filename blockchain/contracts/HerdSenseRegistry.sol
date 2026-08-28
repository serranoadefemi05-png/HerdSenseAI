// SPDX-License-Identifier: MIT
pragma solidity ^0.8.34;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title HerdSenseRegistry
 * @notice On-chain verification registry for HerdSense AI animal
 *         identity and telemetry records.
 *
 * The complete HerdSense records remain in the application's
 * database. This contract stores cryptographic fingerprints
 * that allow those records to be independently verified.
 */
contract HerdSenseRegistry is Ownable {

    // ============================================================
    // STRUCTS
    // ============================================================

    struct AnimalRecord {
        uint256 animalId;
        string tagId;
        bytes32 dataHash;
        address registeredBy;
        uint256 registeredAt;
        bool exists;
    }

    struct TelemetryRecord {
        uint256 telemetryId;
        uint256 animalId;
        bytes32 dataHash;
        address anchoredBy;
        uint256 anchoredAt;
        bool exists;
    }

    // ============================================================
    // STORAGE
    // ============================================================

    mapping(uint256 => AnimalRecord) private animalRecords;

    mapping(uint256 => TelemetryRecord) private telemetryRecords;

    mapping(address => bool) public authorizedWriters;

    // ============================================================
    // EVENTS
    // ============================================================

    event WriterUpdated(
        address indexed writer,
        bool authorized
    );

    event AnimalRegistered(
        uint256 indexed animalId,
        string tagId,
        bytes32 indexed dataHash,
        address indexed registeredBy,
        uint256 timestamp
    );

    event AnimalRecordUpdated(
        uint256 indexed animalId,
        bytes32 indexed dataHash,
        address indexed updatedBy,
        uint256 timestamp
    );

    event TelemetryAnchored(
        uint256 indexed telemetryId,
        uint256 indexed animalId,
        bytes32 indexed dataHash,
        address anchoredBy,
        uint256 timestamp
    );

    // ============================================================
    // MODIFIERS
    // ============================================================

    modifier onlyAuthorizedWriter() {
        require(
            msg.sender == owner() ||
                authorizedWriters[msg.sender],
            "HerdSense: unauthorized writer"
        );
        _;
    }

    // ============================================================
    // CONSTRUCTOR
    // ============================================================

    constructor(
        address initialOwner
    ) Ownable(initialOwner) {
        require(
            initialOwner != address(0),
            "HerdSense: invalid owner"
        );

        authorizedWriters[initialOwner] = true;

        emit WriterUpdated(
            initialOwner,
            true
        );
    }

    // ============================================================
    // WRITER MANAGEMENT
    // ============================================================

    /**
     * @notice Authorize or revoke a backend wallet.
     */
    function setAuthorizedWriter(
        address writer,
        bool authorized
    )
        external
        onlyOwner
    {
        require(
            writer != address(0),
            "HerdSense: invalid writer"
        );

        authorizedWriters[writer] = authorized;

        emit WriterUpdated(
            writer,
            authorized
        );
    }

    // ============================================================
    // ANIMAL REGISTRATION
    // ============================================================

    /**
     * @notice Register an animal's current data fingerprint.
     */
    function registerAnimal(
        uint256 animalId,
        string calldata tagId,
        bytes32 dataHash
    )
        external
        onlyAuthorizedWriter
    {
        require(
            animalId > 0,
            "HerdSense: invalid animal ID"
        );

        require(
            bytes(tagId).length > 0,
            "HerdSense: empty tag ID"
        );

        require(
            dataHash != bytes32(0),
            "HerdSense: empty data hash"
        );

        require(
            !animalRecords[animalId].exists,
            "HerdSense: animal already registered"
        );

        animalRecords[animalId] = AnimalRecord({
            animalId: animalId,
            tagId: tagId,
            dataHash: dataHash,
            registeredBy: msg.sender,
            registeredAt: block.timestamp,
            exists: true
        });

        emit AnimalRegistered(
            animalId,
            tagId,
            dataHash,
            msg.sender,
            block.timestamp
        );
    }

    // ============================================================
    // ANIMAL RECORD UPDATE
    // ============================================================

    /**
     * @notice Update the cryptographic fingerprint of an animal.
     *
     * The previous hash remains permanently available through
     * the blockchain event history.
     */
    function updateAnimalRecord(
        uint256 animalId,
        bytes32 newDataHash
    )
        external
        onlyAuthorizedWriter
    {
        require(
            animalRecords[animalId].exists,
            "HerdSense: animal not registered"
        );

        require(
            newDataHash != bytes32(0),
            "HerdSense: empty data hash"
        );

        animalRecords[animalId].dataHash = newDataHash;
        animalRecords[animalId].registeredBy = msg.sender;
        animalRecords[animalId].registeredAt = block.timestamp;

        emit AnimalRecordUpdated(
            animalId,
            newDataHash,
            msg.sender,
            block.timestamp
        );
    }

    // ============================================================
    // TELEMETRY ANCHORING
    // ============================================================

    /**
     * @notice Anchor a telemetry record on Base.
     */
    function anchorTelemetry(
        uint256 telemetryId,
        uint256 animalId,
        bytes32 dataHash
    )
        external
        onlyAuthorizedWriter
    {
        require(
            telemetryId > 0,
            "HerdSense: invalid telemetry ID"
        );

        require(
            animalId > 0,
            "HerdSense: invalid animal ID"
        );

        require(
            dataHash != bytes32(0),
            "HerdSense: empty data hash"
        );

        require(
            !telemetryRecords[telemetryId].exists,
            "HerdSense: telemetry already anchored"
        );

        telemetryRecords[telemetryId] = TelemetryRecord({
            telemetryId: telemetryId,
            animalId: animalId,
            dataHash: dataHash,
            anchoredBy: msg.sender,
            anchoredAt: block.timestamp,
            exists: true
        });

        emit TelemetryAnchored(
            telemetryId,
            animalId,
            dataHash,
            msg.sender,
            block.timestamp
        );
    }

    // ============================================================
    // READ FUNCTIONS
    // ============================================================

    /**
     * @notice Retrieve an animal's current blockchain record.
     */
    function getAnimalRecord(
        uint256 animalId
    )
        external
        view
        returns (
            uint256,
            string memory,
            bytes32,
            address,
            uint256,
            bool
        )
    {
        AnimalRecord memory record =
            animalRecords[animalId];

        return (
            record.animalId,
            record.tagId,
            record.dataHash,
            record.registeredBy,
            record.registeredAt,
            record.exists
        );
    }

    /**
     * @notice Retrieve an anchored telemetry record.
     */
    function getTelemetryRecord(
        uint256 telemetryId
    )
        external
        view
        returns (
            uint256,
            uint256,
            bytes32,
            address,
            uint256,
            bool
        )
    {
        TelemetryRecord memory record =
            telemetryRecords[telemetryId];

        return (
            record.telemetryId,
            record.animalId,
            record.dataHash,
            record.anchoredBy,
            record.anchoredAt,
            record.exists
        );
    }

    // ============================================================
    // VERIFICATION
    // ============================================================

    /**
     * @notice Verify an animal record against its current
     *         on-chain fingerprint.
     */
    function verifyAnimal(
        uint256 animalId,
        bytes32 suppliedHash
    )
        external
        view
        returns (bool)
    {
        AnimalRecord memory record =
            animalRecords[animalId];

        return
            record.exists &&
            record.dataHash == suppliedHash;
    }

    /**
     * @notice Verify telemetry against its on-chain fingerprint.
     */
    function verifyTelemetry(
        uint256 telemetryId,
        bytes32 suppliedHash
    )
        external
        view
        returns (bool)
    {
        TelemetryRecord memory record =
            telemetryRecords[telemetryId];

        return
            record.exists &&
            record.dataHash == suppliedHash;
    }
}