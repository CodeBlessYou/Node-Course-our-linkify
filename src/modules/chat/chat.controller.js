const Chat = require("./chat.model");
const Message = require("../message/message.model");

const getChats = async (req, res) => {
  const userId = req.user._id;

  const chats = await Chat.find({ participants: userId })
    .populate("participants", "_id username")
    .populate({
      path: "lastMessage",
      select: "sender content createdAt",
      populate: {
        path: "sender",
        select: "username",
      },
    })
    .sort({ updatedAt: -1 });

  res.json({ chats });
};

const getChatMessages = async (req, res) => {
  const { chatId } = req.params;

  let { page = 1, limit = 10 } = req.query;
  page = parseInt(page);
  limit = parseInt(limit);

  const messages = await Message.find({ chatId })
    .populate("sender", "_id username")
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();

  const hasPreviousMessages = messages.length === limit ? true : false;

  res.json({ messages, hasPreviousMessages, page, limit });
};

const createChat = async (req, res) => {
  const userId = req.user._id;
  const receiverId = req.body.receiverId;
  if (!receiverId)
    return res.status(400).json({ message: "Receiver required!" });

  let chat = await Chat.findOne({
    participants: { $all: [userId, receiverId], $size: 2 },
  });

  if (!chat) {
    chat = new Chat({
      participants: [userId, receiverId],
    });
    await chat.save();
  }

  res.status(201).json(chat);
};

const createGroup = async (req, res) => {
  const userId = req.user._id;
  const { participants, groupName } = req.body;

  if (!participants)
    return res.status(400).json({ message: "Participants are required!" });

  const chat = new Chat({
    participants: [...participants, userId],
    groupName: groupName,
    isGroup: true,
    admins: [userId],
  });
  await chat.save();

  res.status(201).json(chat);
};

module.exports = { getChats, getChatMessages, createChat, createGroup };
