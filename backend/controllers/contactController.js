const EmergencyContact = require("../models/EmergencyContact");
const User = require("../models/User");
const Incident = require("../models/Incident");

// ADD EMERGENCY CONTACT / GUARDIAN
const addContact = async (req, res) => {
  try {
    const ownerUserId = req.user.userId;
    const { name, phone, email, relationship, tier } = req.body;

    if (!name || !phone) {
      return res.status(400).json({
        success: false,
        message: "Contact name and phone number are required"
      });
    }

    const contactTier = ["PRIMARY", "SECONDARY", "TERTIARY"].includes(tier) ? tier : "PRIMARY";
    const contactId = `CNT-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const invitationToken = `INV-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

    // Check if the contact phone or email matches an existing registered user
    let guardianUserId = null;
    let initialStatus = "PENDING";

    const matchedUser = await User.findOne({
      $or: [
        { phone: phone.trim() },
        { email: email ? email.toLowerCase().trim() : "nonexistent@safe360.internal" }
      ]
    });

    if (matchedUser) {
      guardianUserId = matchedUser.userId;
      // Auto-accept if the owner adds themselves or an already linked identity
    }

    const contact = await EmergencyContact.create({
      contactId,
      ownerUserId,
      guardianUserId,
      name: name.trim(),
      phone: phone.trim(),
      email: email ? email.toLowerCase().trim() : "",
      relationship: relationship || "Emergency Contact",
      tier: contactTier,
      status: initialStatus,
      invitationToken
    });

    res.status(201).json({
      success: true,
      message: `Emergency contact ${name} added successfully as ${contactTier} tier`,
      contact,
      invitationUrl: `/api/contacts/accept-invite?token=${invitationToken}`
    });

  } catch (error) {
    console.error("Add contact error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to add emergency contact",
      error: error.message
    });
  }
};

// GET CONTACTS FOR LOGGED IN USER
const getContacts = async (req, res) => {
  try {
    const ownerUserId = req.user.userId;
    const contacts = await EmergencyContact.find({ ownerUserId }).sort({ createdAt: -1 });

    res.json({
      success: true,
      count: contacts.length,
      contacts
    });

  } catch (error) {
    console.error("Get contacts error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to get emergency contacts",
      error: error.message
    });
  }
};

// DELETE CONTACT
const deleteContact = async (req, res) => {
  try {
    const { id } = req.params;
    const ownerUserId = req.user.userId;

    const contact = await EmergencyContact.findOne({
      $or: [{ contactId: id }, { _id: id }],
      ownerUserId
    });

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: "Emergency contact not found or unauthorized"
      });
    }

    await EmergencyContact.deleteOne({ _id: contact._id });

    res.json({
      success: true,
      message: `Contact ${contact.name} removed from safety circle`
    });

  } catch (error) {
    console.error("Delete contact error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to delete contact",
      error: error.message
    });
  }
};

// ACCEPT GUARDIAN INVITATION (Token based)
const acceptInvitation = async (req, res) => {
  try {
    const { token } = req.body;
    const acceptingUser = req.user;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: "Invitation token is required"
      });
    }

    const contact = await EmergencyContact.findOne({ invitationToken: token });

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: "Invalid or expired invitation token"
      });
    }

    if (contact.status === "ACCEPTED" && contact.guardianUserId === acceptingUser.userId) {
      return res.json({
        success: true,
        message: "Invitation already accepted",
        contact
      });
    }

    // Link accepting guardian's userId to existing record
    contact.guardianUserId = acceptingUser.userId;
    contact.status = "ACCEPTED";
    await contact.save();

    // Fetch owner profile
    const owner = await User.findOne({ userId: contact.ownerUserId });

    res.json({
      success: true,
      message: `Successfully accepted guardian invitation for ${owner ? owner.name : "protected user"}!`,
      contact,
      protectedPerson: owner ? { name: owner.name, userId: owner.userId, phone: owner.phone } : null
    });

  } catch (error) {
    console.error("Accept invitation error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to accept invitation",
      error: error.message
    });
  }
};

// GET CONNECTED PROTECTED PEOPLE FOR GUARDIAN / CAREGIVER
const getConnectedPeople = async (req, res) => {
  try {
    const guardianUserId = req.user.userId;

    const relationships = await EmergencyContact.find({
      guardianUserId,
      status: "ACCEPTED"
    });

    const ownerUserIds = relationships.map(r => r.ownerUserId);
    const protectedUsers = await User.find({ userId: { $in: ownerUserIds } });

    const connectedList = relationships.map(rel => {
      const u = protectedUsers.find(p => p.userId === rel.ownerUserId);
      return {
        relationshipId: rel.contactId,
        tier: rel.tier,
        relationship: rel.relationship,
        protectedPerson: u ? {
          userId: u.userId,
          name: u.name,
          phone: u.phone,
          email: u.email,
          userType: u.userType
        } : { userId: rel.ownerUserId, name: rel.name, phone: rel.phone }
      };
    });

    res.json({
      success: true,
      count: connectedList.length,
      connectedPeople: connectedList
    });

  } catch (error) {
    console.error("Get connected people error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to fetch connected people",
      error: error.message
    });
  }
};

// GET AUTHORIZED INCIDENTS FOR GUARDIAN
const getConnectedIncidents = async (req, res) => {
  try {
    const guardianUserId = req.user.userId;

    const relationships = await EmergencyContact.find({
      guardianUserId,
      status: "ACCEPTED"
    });

    const ownerUserIds = relationships.map(r => r.ownerUserId);

    const incidents = await Incident.find({
      userId: { $in: ownerUserIds }
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      count: incidents.length,
      incidents
    });

  } catch (error) {
    console.error("Get connected incidents error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to fetch authorized incidents",
      error: error.message
    });
  }
};

module.exports = {
  addContact,
  getContacts,
  deleteContact,
  acceptInvitation,
  getConnectedPeople,
  getConnectedIncidents
};
