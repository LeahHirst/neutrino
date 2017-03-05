var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var session = require('./sessions.js')
const util = require('util')

io.on("connection", function(socket) {
	console.log("user connected (socket ID " + socket.id + ")");

	socket.on("register", function(client) {
		console.log("received register event from socket (" + socket.id + ")");
		console.log(client);
		var user = client.desiredUsername;
		var filename = client.fileName;
		var passwd = client.password;
		var fileData = client.fileData;
		var sessionId = session.createNewSession(user, filename, fileData, passwd);
		//add this client to the group defined by the session id
		socket.join(sessionId)
		session.addUserToSession(sessionId, user)
		socket.emit("register_response", {
			"sessionId": sessionId,
			"username": user,
		});
	});

	socket.on("join", function(client) {
		console.log("received join event from socket (" + socket.id + ")");
		console.log(client);
		var user = client.desiredUsername;
		var sessionId = client.sessionId;
		socket.join(sessionId)
		session.addUserToSession(sessionId, user)
	});

	socket.on("deregister", function(client) {
		//TODO more checking here
		console.log("received deregister event from socket (" + socket.id + ")");
		socket.leave(client.sessionId);
		//TODO remove from session in sessions package
	});

	socket.on("request", function(client) {
		console.log("received request event from socket (" + socket.id + ")");
		console.log(client);
		var s = session.getSessionById(client.sessionId);
		console.log("broadcasting file data to session: " + s.id);
		data = {
			"fileData": s.fileData,
			"collaborators": [],
		};
		for (username in session.getUsernamesForSession(s.id)) {
			var cursor = s.sessions[username].cursorPos;
			var selection = s.sessions[username].selectionPos;
			data.collaborators.push({
				"username": username,
				"cursor": cursor,
				"selection": selection,
			});
		}
		socket.broadcast.to(s.id).emit("update", data);
	});

	//when client sends an update
	socket.on("update", function(update) {
		console.log("received request event from socket (" + socket.id + ")");
		console.log(client);
		var cursor = update.cursor;
		var selection = update.selection;
		var user = update.username;
		var fileData = update.fileData;
		//TODO prevent smurf attacks
		var sessionId = update.sessionId;
		var s = session.getSessionById(sessionId)
		s.fileData = fileData;
		session.setCursorAndSelectionPos(sessionId, user, cursor, selection)
	});
});

http.listen(3000, function() {
  console.log("listening on *:3000");
});
