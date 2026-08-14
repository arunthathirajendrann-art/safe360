const express = require("express");
const {
  addContact,
  getContacts,
  deleteContact,
  acceptInvitation,
  getConnectedPeople,
  getConnectedIncidents
} = require("../controllers/contactController");
const { authMiddleware } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(authMiddleware);

router.post("/", addContact);
router.get("/", getContacts);
router.delete("/:id", deleteContact);
router.post("/accept-invite", acceptInvitation);
router.get("/guardians/people", getConnectedPeople);
router.get("/guardians/incidents", getConnectedIncidents);

module.exports = router;
