/**
 * @license
 * This file is part of Hacklily, a web-based LilyPond editor.
 * Copyright (C) 2017 - present Joshua Netterfield <joshua@nettek.ca>
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin Street, Fifth Floor, Boston, MA 02110-1301  USA
 */

#include "hacklilyserver.h"

#include <QWebSocket>
#include <QJsonDocument>
#include <QJsonObject>
#include <QUrlQuery>
#include <QNetworkReply>

HacklilyServer::HacklilyServer(QString rendererDockerTag,
                               int wsPort,
                               QByteArray ghClientID,
                               QByteArray ghSecret,
                               QByteArray ghAdminToken,
                               QString ghOrg,
                               QObject *parent) :
    QObject(parent),
    _rendererDockerTag(rendererDockerTag),
    _wsPort(wsPort),
    _ghClientID(ghClientID),
    _ghSecret(ghSecret),
    _ghAdminToken(ghAdminToken),
    _ghOrg(ghOrg),
    _server(new QWebSocketServer("hacklily-server", QWebSocketServer::NonSecureMode, this)),
    _lastSocketID(-1),
    _processingRequest(false),
    _nam(new QNetworkAccessManager(this))
{
    _renderer = NULL;
    _initRenderer();

    if (!_server->listen(QHostAddress::Any, wsPort)) {
        qDebug() << "Failed to bind to port " << wsPort << ". Cannot continue";
        qFatal("Cannot continue");
    }
    connect(_server, &QWebSocketServer::newConnection, this, &HacklilyServer::_handleNewConnection);
}

HacklilyServer::~HacklilyServer() {
}

void HacklilyServer::_handleNewConnection() {
    while (_server->hasPendingConnections()) {
        auto socket = _server->nextPendingConnection();
        int socketID = ++_lastSocketID;

        socket->setParent(this);
        socket->setProperty("socketID", socketID);
        connect(socket, &QWebSocket::textMessageReceived, this, &HacklilyServer::_handleTextMessageReceived);
        connect(socket, &QWebSocket::binaryMessageReceived, this, &HacklilyServer::_handleBinaryMessageReceived);
        connect(socket, &QWebSocket::disconnected, this, &HacklilyServer::_handleSocketDisconnected);
        _sockets.insert(socketID, socket);
    }
}

void HacklilyServer::_handleTextMessageReceived(QString message) {
    QWebSocket* socket = qobject_cast<QWebSocket *>(sender());
    QJsonParseError parseError;
    auto request = QJsonDocument::fromJson(message.toLatin1(), &parseError);
    if (parseError.error != QJsonParseError::NoError) {
        QJsonObject errorObj;
        errorObj["code"] = ERROR_JSON_PARSE;
        errorObj["message"] = "Parse Error: " + parseError.errorString();
        QJsonObject responseObj;
        responseObj["jsonrpc"] = "2.0";
        responseObj["id"] = QJsonValue();
        responseObj["error"] = errorObj;
        QJsonDocument response;
        response.setObject(responseObj);
        auto responseJSON = response.toJson(QJsonDocument::Compact);
        socket->sendTextMessage(responseJSON);
    }
    auto requestObj = request.object();
    if (requestObj["method"] == "render") {
        HacklilyServerRequest req = {
            requestObj["params"].toObject()["src"].toString(),
            requestObj["params"].toObject()["backend"].toString(),
            socket,
            requestObj["id"].toString(),
        };
        if (!req.src.length() || !req.backend.length() || (req.backend != "svg" && req.backend != "pdf")) {
            socket->sendTextMessage("{\"error\": \"Invalid request.\", \"errorSlug\": \"invalid_request\"}");
            return;
        }
        _requests.push_back(req);
        _processIfPossible();
    } else if (requestObj["method"] == "oauth") {
        QNetworkRequest request;
        request.setUrl(QUrl("https://github.com/login/oauth/access_token"));
        request.setRawHeader("Accept", QByteArray("application/json"));
        QUrlQuery queryData;
        queryData.addQueryItem("state", requestObj["params"].toObject()["state"].toString());
        queryData.addQueryItem("client_id", _ghClientID);
        queryData.addQueryItem("client_secret", _ghSecret);
        queryData.addQueryItem("code", requestObj["params"].toObject()["oauth"].toString());
        QString queryString = queryData.toString();
        QNetworkReply* reply = _nam->post(request, queryString.toLatin1());
        bool ok;
        int socketID = socket->property("socketID").toInt(&ok);
        if (!ok) {
            qDebug() << "No socketID found. Uh oh.";
        } else {
            reply->setProperty("socketID", socketID);
            reply->setProperty("requestID", requestObj["id"].toString());
            qDebug() << requestObj["id"] << reply->property("requestID");
        }
        connect(reply, &QNetworkReply::finished, this, &HacklilyServer::_handleOAuthReply);
    } else if (requestObj["method"] == "signOut") {
        if (requestObj["params"].toObject()["token"].toString().size() < 1) {
            socket->sendTextMessage("{\"error\": \"Invalid request.\", \"errorSlug\": \"invalid_request\"}");
            return;
        }
        QNetworkRequest request;
        request.setUrl(QUrl("https://api.github.com/applications/" + _ghClientID + "/tokens/" + requestObj["params"].toObject()["token"].toString()));
        request.setRawHeader("Accept", QByteArray("application/json"));
        request.setRawHeader("Authorization", "Basic " + (_ghClientID + ":" + _ghSecret).toBase64());
        QNetworkReply* reply = _nam->deleteResource(request);
        bool ok;
        int socketID = socket->property("socketID").toInt(&ok);
        if (!ok) {
            qDebug() << "No socketID found. Uh oh.";
        } else {
            reply->setProperty("socketID", socketID);
            reply->setProperty("requestID", requestObj["id"].toString());
            qDebug() << requestObj["id"] << reply->property("requestID");
        }
        connect(reply, &QNetworkReply::finished, this, &HacklilyServer::_handleOAuthDelete);
    }
}

void HacklilyServer::_handleBinaryMessageReceived(QByteArray) {
    QWebSocket* socket = qobject_cast<QWebSocket *>(sender());
    qWarning() << "Got binary message. Disconnecting.";
    socket->close(QWebSocketProtocol::CloseCodeDatatypeNotSupported);
}

void HacklilyServer::_handleSocketDisconnected() {
    QWebSocket* socket = qobject_cast<QWebSocket *>(sender());
    bool ok = true;
    int socketID = socket->property("socketID").toInt(&ok);
    if (!ok) {
        qDebug() << "Warning: could not get socketID of socket. Memory leak.";
        return;
    }
    _sockets.remove(socketID);
    socket->deleteLater();
}

void HacklilyServer::_initRenderer() {
    if (_renderer) {
        _renderer->deleteLater();
    }
    _renderer = new QProcess(this);

    connect(_renderer, &QProcess::readyReadStandardOutput, this, &HacklilyServer::_handleRendererOutput);
    connect(_renderer, &QProcess::started, this, &HacklilyServer::_processIfPossible);

    _renderer->setProcessChannelMode(QProcess::ForwardedErrorChannel);
    _renderer->start("docker",
        QStringList() << "run" << "--rm" << "-i" <<  "--net=none" << "-m1g" << "--cpus=1" << _rendererDockerTag);
}

void HacklilyServer::_processIfPossible() {
    if (_renderer->state() != QProcess::Running || _processingRequest || _requests.length() < 1) {
        return;
    }
    _processingRequest = true;
    QJsonObject requestObj;
    if (_requests[0].backend == "svg") {
        requestObj["src"] = "#(ly:set-option 'backend '" + _requests[0].backend+ ")\n" + _requests[0].src;
    } else {
        requestObj["src"] = "\n" + _requests[0].src;
    }
    requestObj["backend"] = _requests[0].backend;
    QJsonDocument request;
    request.setObject(requestObj);
    auto json = request.toJson(QJsonDocument::Compact);
    json += "\n";
    _renderer->write(json.data());
}

void HacklilyServer::_handleOAuthReply() {
    QNetworkReply* reply = qobject_cast<QNetworkReply *>(sender());

    QByteArray responseResult = reply->readAll();
    reply->deleteLater();

    bool ok;
    int socketID = reply->property("socketID").toInt(&ok);
    if (!ok) {
        qDebug() << "In oauth reply, missing socketID. Cannot continue with oauth.";
        return;
    }

    QString requestID = reply->property("requestID").toString();
    if (!_sockets.contains(socketID)) {
        qDebug() << "Lost socket mid-oauth.";
        return;
    }
    QWebSocket* socket = _sockets.value(socketID);
    if (!socket) {
        return;
    }

    QJsonParseError parseError;
    auto responseResultJSON = QJsonDocument::fromJson(responseResult, &parseError);
    if (parseError.error != QJsonParseError::NoError) {
        QJsonObject errorObj;
        errorObj["code"] = ERROR_GITHUB;
        errorObj["message"] = "Parse Error: " + parseError.errorString();
        QJsonObject responseObj;
        responseObj["jsonrpc"] = "2.0";
        responseObj["id"] = requestID;
        responseObj["error"] = errorObj;
        QJsonDocument response;
        response.setObject(responseObj);
        auto responseJSON = response.toJson(QJsonDocument::Compact);
        socket->sendTextMessage(responseJSON);
        return;
    }
    auto responseResultObj = responseResultJSON.object();
    if (responseResultObj.contains("errors") || responseResultObj.contains("error")) {
        QJsonObject errorObj;
        errorObj["code"] = ERROR_GITHUB;
        errorObj["message"] = "GitHub Authentication Error";
        QJsonObject responseObj;
        responseObj["jsonrpc"] = "2.0";
        responseObj["id"] = requestID;
        responseObj["error"] = responseResultObj;
        QJsonDocument response;
        response.setObject(responseObj);
        auto responseJSON = response.toJson(QJsonDocument::Compact);
        socket->sendTextMessage(responseJSON);
        return;
    }
    if (!responseResultObj.contains("access_token")) {
        QJsonObject errorObj;
        errorObj["code"] = ERROR_GITHUB;
        errorObj["message"] = "GitHub Authentication Error";
        QJsonObject responseObj;
        responseObj["jsonrpc"] = "2.0";
        responseObj["id"] = requestID;
        responseObj["error"] = "No access token";
        QJsonDocument response;
        response.setObject(responseObj);
        auto responseJSON = response.toJson(QJsonDocument::Compact);
        socket->sendTextMessage(responseJSON);
        return;
    }

    UserInfo userInfo;
    userInfo.accessToken = responseResultObj.value("access_token").toString().toLatin1();
    if (_userInfo.contains(userInfo.accessToken)) {
        // Timing attack?
        QJsonObject errorObj;
        errorObj["code"] = ERROR_INTERNAL;
        errorObj["message"] = "Invalid CSRF.";
        QJsonObject responseObj;
        responseObj["jsonrpc"] = "2.0";
        responseObj["id"] = requestID;
        responseObj["error"] = "Invalid CSRF";
        QJsonDocument response;
        response.setObject(responseObj);
        auto responseJSON = response.toJson(QJsonDocument::Compact);
        socket->sendTextMessage(responseJSON);
        return;
    }

    _userInfo[requestID] = userInfo;

    QNetworkRequest request;
    request.setUrl(QUrl("https://api.github.com/user"));
    request.setRawHeader("Accept", QByteArray("application/json"));
    request.setRawHeader("Authorization", "token " + userInfo.accessToken);
    QNetworkReply* userReply = _nam->get(request);
    userReply->setProperty("socketID", socketID);
    userReply->setProperty("requestID", requestID);
    connect(userReply, &QNetworkReply::finished, this, &HacklilyServer::_handleUserReply);
}

void HacklilyServer::_handleUserReply() {
    QNetworkReply* reply = qobject_cast<QNetworkReply *>(sender());

    QByteArray responseResult = reply->readAll();
    reply->deleteLater();

    bool ok;
    int socketID = reply->property("socketID").toInt(&ok);
    if (!ok) {
        qDebug() << "In oauth reply, missing socketID. Cannot continue with oauth.";
        return;
    }

    QString requestID = reply->property("requestID").toString();
    if (!_sockets.contains(socketID)) {
        qDebug() << "Lost socket mid-oauth.";
        return;
    }
    QWebSocket* socket = _sockets.value(socketID);
    if (!socket) {
        return;
    }

    QJsonParseError parseError;
    auto responseResultJSON = QJsonDocument::fromJson(responseResult, &parseError);
    if (parseError.error != QJsonParseError::NoError) {
        QJsonObject errorObj;
        errorObj["code"] = ERROR_GITHUB;
        errorObj["message"] = "Parse Error: " + parseError.errorString();
        QJsonObject responseObj;
        responseObj["jsonrpc"] = "2.0";
        responseObj["id"] = requestID;
        responseObj["error"] = errorObj;
        QJsonDocument response;
        response.setObject(responseObj);
        auto responseJSON = response.toJson(QJsonDocument::Compact);
        socket->sendTextMessage(responseJSON);
        return;
    }

    auto responseResultObj = responseResultJSON.object();
    if (responseResultObj.contains("error")) {
        QJsonObject errorObj;
        errorObj["code"] = ERROR_GITHUB;
        errorObj["message"] = "GitHub Authentication Error";
        QJsonObject responseObj;
        responseObj["jsonrpc"] = "2.0";
        responseObj["id"] = requestID;
        responseObj["error"] = responseResultObj;
        QJsonDocument response;
        response.setObject(responseObj);
        auto responseJSON = response.toJson(QJsonDocument::Compact);
        socket->sendTextMessage(responseJSON);
        return;
    }

    if (!responseResultObj.contains("email") || !responseResultObj.contains("login") || !responseResultObj.contains("name")) {
        QJsonObject errorObj;
        errorObj["code"] = ERROR_GITHUB;
        errorObj["message"] = "GitHub Authentication Error";
        QJsonObject responseObj;
        responseObj["jsonrpc"] = "2.0";
        responseObj["id"] = requestID;
        responseObj["error"] = "Email, login, and name are required.";
        QJsonDocument response;
        response.setObject(responseObj);
        auto responseJSON = response.toJson(QJsonDocument::Compact);
        socket->sendTextMessage(responseJSON);
        return;
    }

    UserInfo userInfo = _userInfo[requestID];
    userInfo.email = responseResultObj.value("email").toString();
    userInfo.name = responseResultObj.value("name").toString();
    userInfo.username = responseResultObj.value("login").toString();
    _userInfo[requestID] = userInfo;

    QNetworkRequest request;
    request.setUrl(QUrl("https://api.github.com/orgs/" + _ghOrg + "/repos"));
    request.setRawHeader("Accept", QByteArray("application/json"));
    request.setRawHeader("Authorization", "token " + _ghAdminToken);
    QJsonObject requestDataObj;
    requestDataObj["name"] = "hacklily-" + userInfo.username;
    requestDataObj["homepage"] = "https://" + _ghOrg + ".github.io/" + userInfo.username;
    requestDataObj["has_issues"] = false;
    requestDataObj["has_projects"] = false;
    requestDataObj["has_wiki"] = false;
    requestDataObj["auto_init"] = true;
    QJsonDocument requestDataJSON;
    requestDataJSON.setObject(requestDataObj);
    QNetworkReply* userReply = _nam->post(request, requestDataJSON.toJson());
    userReply->setProperty("socketID", socketID);
    userReply->setProperty("requestID", requestID);
    connect(userReply, &QNetworkReply::finished, this, &HacklilyServer::_handleRepoCreation);
}

void HacklilyServer::_handleRepoCreation() {
    QNetworkReply* reply = qobject_cast<QNetworkReply *>(sender());

    QByteArray responseResult = reply->readAll();
    reply->deleteLater();

    bool ok;
    int socketID = reply->property("socketID").toInt(&ok);
    if (!ok) {
        qDebug() << "In oauth reply, missing socketID. Cannot continue with oauth.";
        return;
    }

    QString requestID = reply->property("requestID").toString();
    if (!_sockets.contains(socketID)) {
        qDebug() << "Lost socket mid-oauth.";
        return;
    }
    QWebSocket* socket = _sockets.value(socketID);
    if (!socket) {
        return;
    }

    QJsonParseError parseError;
    auto responseResultJSON = QJsonDocument::fromJson(responseResult, &parseError);
    if (parseError.error != QJsonParseError::NoError) {
        QJsonObject errorObj;
        errorObj["code"] = ERROR_GITHUB;
        errorObj["message"] = "Parse Error: " + parseError.errorString();
        QJsonObject responseObj;
        responseObj["jsonrpc"] = "2.0";
        responseObj["id"] = requestID;
        responseObj["error"] = errorObj;
        QJsonDocument response;
        response.setObject(responseObj);
        auto responseJSON = response.toJson(QJsonDocument::Compact);
        socket->sendTextMessage(responseJSON);
        return;
    }

    auto responseResultObj = responseResultJSON.object();
    if (responseResultObj.contains("errors") || responseResultObj.contains("error")) {
        // That is okay -- likely already exists.
        qDebug() << "Logged in " << _userInfo[requestID].username;
        this->_sendUserInfo(requestID, socketID);
        return;
    }

    QNetworkRequest request;
    UserInfo userInfo = _userInfo[requestID];
    request.setUrl(QUrl("https://api.github.com/repos/" + _ghOrg + "/hacklily-" + userInfo.username + "/collaborators/" + userInfo.username));
    request.setRawHeader("Accept", QByteArray("application/json"));
    request.setRawHeader("Authorization", "token " + _ghAdminToken);
    QNetworkReply* userReply = _nam->put(request, "");
    userReply->setProperty("socketID", socketID);
    userReply->setProperty("requestID", requestID);
    connect(userReply, &QNetworkReply::finished, this, &HacklilyServer::_handleRepoCollaboratorsSet);
}

void HacklilyServer::_handleRepoCollaboratorsSet() {
    QNetworkReply* reply = qobject_cast<QNetworkReply *>(sender());

    QByteArray responseResult = reply->readAll();
    reply->deleteLater();

    bool ok;
    int socketID = reply->property("socketID").toInt(&ok);
    if (!ok) {
        qDebug() << "In oauth reply, missing socketID. Cannot continue with oauth.";
        return;
    }

    QString requestID = reply->property("requestID").toString();
    if (!_sockets.contains(socketID)) {
        qDebug() << "Lost socket mid-oauth.";
        return;
    }
    QWebSocket* socket = _sockets.value(socketID);
    if (!socket) {
        return;
    }

    qDebug() << "Signed up " << _userInfo[requestID].username;
    this->_sendUserInfo(requestID, socketID);
}

void HacklilyServer::_sendUserInfo(QString requestID, int socketID) {
    QWebSocket* socket = _sockets.value(socketID);
    if (!socket) {
        return;
    }

    UserInfo userInfo = _userInfo[requestID];
    QJsonObject userInfoJSON;
    userInfoJSON["accessToken"] = QString(userInfo.accessToken);
    userInfoJSON["email"] = userInfo.email;
    userInfoJSON["username"] = userInfo.username;
    userInfoJSON["name"] = userInfo.name;
    userInfoJSON["repo"] = _ghOrg + "/hacklily-" + userInfo.username;

    QJsonObject responseObj;
    responseObj["jsonrpc"] = "2.0";
    responseObj["id"] = requestID;
    responseObj["result"] = userInfoJSON;
    QJsonDocument responseJSON;
    responseJSON.setObject(responseObj);
    auto responseJSONText = responseJSON.toJson(QJsonDocument::Compact);
    socket->sendTextMessage(responseJSONText);
}

void HacklilyServer::_handleOAuthDelete() {
    QNetworkReply* reply = qobject_cast<QNetworkReply *>(sender());

    QByteArray responseResult = reply->readAll();
    reply->deleteLater();

    bool ok;
    int socketID = reply->property("socketID").toInt(&ok);
    if (!ok) {
        qDebug() << "In oauth reply, missing socketID. Cannot continue with oauth.";
        return;
    }

    QString requestID = reply->property("requestID").toString();
    if (!_sockets.contains(socketID)) {
        qDebug() << "Lost socket mid-oauth.";
        return;
    }
    QWebSocket* socket = _sockets.value(socketID);
    if (!socket) {
        return;
    }

    if (reply->error() != QNetworkReply::NoError) {
        qDebug() << responseResult;
        QJsonObject responseObj;
        responseObj["jsonrpc"] = "2.0";
        responseObj["id"] = requestID;
        responseObj["error"] = "Could not remove authorization.";
        QJsonDocument responseJSON;
        responseJSON.setObject(responseObj);
        auto responseJSONText = responseJSON.toJson(QJsonDocument::Compact);
        socket->sendTextMessage(responseJSONText);
        return;
    }

    QJsonObject responseObj;
    responseObj["jsonrpc"] = "2.0";
    responseObj["id"] = requestID;
    responseObj["result"] = "OK";
    QJsonDocument responseJSON;
    responseJSON.setObject(responseObj);
    auto responseJSONText = responseJSON.toJson(QJsonDocument::Compact);
    socket->sendTextMessage(responseJSONText);
}

void HacklilyServer::_handleRendererOutput() {
    if (!_processingRequest) {
        qDebug() << "Got renderer output when not processing request.";
        // TODO: reset?
        return;
    }
    if (!_renderer->bytesAvailable()) {
        qDebug() << "Got notification that bytes are available, but none are.";
        return;
    }
    if (!_renderer->canReadLine()) {
        qDebug() << "Waiting until I can read a whole line.";
        return;
    }
    auto response = _renderer->readLine();
    auto sender = _requests[0].sender;
    auto requestID = _requests[0].requestID;
    _requests.pop_front();

    QJsonParseError parseError;
    auto responseJSON = QJsonDocument::fromJson(response, &parseError);
    if (_sockets.values().contains(sender)) {
        if (parseError.error != QJsonParseError::NoError) {
            QJsonObject errorObj;
            errorObj["code"] = 2;
            errorObj["message"] = "Internal error: could not parse response from lilypond server";
            QJsonObject responseObj;
            responseObj["jsonrpc"] = "2.0";
            responseObj["id"] = requestID;
            responseObj["error"] = errorObj;
            QJsonDocument response;
            response.setObject(responseObj);
            auto responseJSONText = response.toJson(QJsonDocument::Compact);
            sender->sendTextMessage(responseJSONText);
        } else {
            qDebug() << "Sending response";
            QJsonObject responseObj;
            responseObj["jsonrpc"] = "2.0";
            responseObj["id"] = requestID;
            responseObj["result"] = responseJSON.object();
            QJsonDocument response;
            response.setObject(responseObj);
            auto responseJSONText = response.toJson(QJsonDocument::Compact);
            sender->sendTextMessage(responseJSONText);
        }
    } else {
        qDebug() << "Sender died mid-flight. Ignoring";
    }
    _processingRequest = false;
    _processIfPossible();
}
