const EmergencyContact = require("../models/EmergencyContact");
const User = require("../models/User");
const Incident = require("../models/Incident");

// Generate short random 6-character connection code (e.g. A7K9P2)
function generate6DigitCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "";
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// GENERATE DYNAMIC CONNECTION CODE (Mobile Protected Person)
const generateConnectionCode = async (req, res) => {
  try {
    const ownerUserId = req.user.userId;
    const code = generate6DigitCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

    const contactId = `CNT-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const invitationToken = `INV-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

    // Create a pending invitation with connectionCode
    const contact = await EmergencyContact.create({
      contactId,
      ownerUserId,
      guardianUserId: null,
      name: "Guardian",
      phone: "Pending Connection",
      email: "",
      relationship: "Guardian",
      tier: "PRIMARY",
      status: "PENDING",
      invitationToken,
      connectionCode: code,
      codeExpiresAt: expiresAt
    });

    res.status(201).json({
      success: true,
      message: "Connection code generated successfully",
      code,
      expiresAt,
      contact
    });

  } catch (error) {
    console.error("Generate connection code error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to generate connection code",
      error: error.message
    });
  }
};

// CONNECT WITH CODE (Guardian Dashboard / Mobile)
const connectWithCode = async (req, res) => {
  try {
    const { code } = req.body;
    const guardianUser = req.user;

    if (!code) {
      return res.status(400).json({
        success: false,
        message: "Connection code is required"
      });
    }

    const cleanCode = code.trim().toUpperCase();

    const contact = await EmergencyContact.findOne({
      connectionCode: cleanCode,
      status: "PENDING"
    });

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: "Invalid connection code. Please check the code and try again."
      });
    }

    if (contact.codeExpiresAt && new Date(contact.codeExpiresAt) < new Date()) {
      contact.status = "EXPIRED";
      await contact.save();
      return res.status(400).json({
        success: false,
        message: "This connection code has expired. Please generate a new code on the protected person's app."
      });
    }

    // Prevent connecting to oneself
    if (contact.ownerUserId === guardianUser.userId) {
      return res.status(400).json({
        success: false,
        message: "You cannot connect to yourself as a guardian."
      });
    }

    // Link Guardian
    contact.guardianUserId = guardianUser.userId;
    contact.name = guardianUser.name;
    contact.phone = guardianUser.phone;
    contact.email = guardianUser.email;
    contact.status = "ACCEPTED";
    await contact.save();

    // Fetch owner details
    const owner = await User.findOne({ userId: contact.ownerUserId });

    res.json({
      success: true,
      message: `Connected successfully with ${owner ? owner.name : "protected person"}!`,
      contact,
      protectedPerson: owner ? {
        userId: owner.userId,
        name: owner.name,
        phone: owner.phone,
        email: owner.email
      } : { userId: contact.ownerUserId }
    });

  } catch (error) {
    console.error("Connect with code error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to connect with code",
      error: error.message
    });
  }
};

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

    contact.guardianUserId = acceptingUser.userId;
    contact.status = "ACCEPTED";
    await contact.save();

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

// GET CONNECTED PROTECTED PEOPLE FOR GUARDIAN
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
  generateConnectionCode,
  connectWithCode,
  addContact,
  getContacts,
  deleteContact,
  acceptInvitation,
  getConnectedPeople,
  getConnectedIncidents
};
