/**
 * @license
 * This file is part of Hacklily, a web-based LilyPond editor.
 * Copyright (C) 2017 - present Joshua Netterfield <joshua@nettek.ca>
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

#include "hacklilyserver.h"

#include <QWebSocket>
#include <QJsonDocument>
#include <QJsonObject>
#include <QUrlQuery>
#include <QNetworkReply>

HacklilyServer::HacklilyServer(QString rendererDockerTag,
                               QString rendererUnstableDockerTag,
                               int wsPort,
                               QByteArray ghClientID,
                               QByteArray ghSecret,
                               int jobs,
                               QObject *parent) : QObject(parent),
                                                  _rendererDockerTag(rendererDockerTag),
                                                  _rendererUnstableDockerTag(rendererUnstableDockerTag),
                                                  _wsPort(wsPort),
                                                  _ghClientID(ghClientID),
                                                  _ghSecret(ghSecret),
                                                  _analytics_renders(0),
                                                  _analytics_saves(0),
                                                  _analytics_sign_in(0),
                                                  _lastSocketID(-1),
                                                  _nam(new QNetworkAccessManager(this)),
                                                  _maxJobs(jobs),
                                                  _startupTime(QDateTime::currentDateTimeUtc()),
                                                  _server(new QWebSocketServer("hacklily-server", QWebSocketServer::NonSecureMode, this)),
                                                  _coordinator(NULL),
                                                  _coordinatorPingTimer(NULL)
{
    _initRenderers();

    if (!_server->listen(QHostAddress::Any, wsPort))
    {
        qDebug() << "Failed to bind to port " << wsPort << ". Cannot continue";
        qFatal("Cannot continue");
    }
    connect(_server, &QWebSocketServer::newConnection, this, &HacklilyServer::_handleNewConnection);

    if (!ghClientID.size())
    {
        qWarning() << "No gh client ID specified. GITHUB INTEGRATION DISABLED";
    }
    if (!ghSecret.size())
    {
        qWarning() << "No gh secret specified. GITHUB INTEGRATION DISABLED";
    }
}

HacklilyServer::HacklilyServer(QString rendererDockerTag,
                               QString rendererUnstableDockerTag,
                               QString coordinator,
                               int jobs,
                               QObject *parent) : QObject(parent),
                                                  _rendererDockerTag(rendererDockerTag),
                                                  _rendererUnstableDockerTag(rendererUnstableDockerTag),
                                                  _coordinatorURL(coordinator),
                                                  _analytics_renders(0),
                                                  _analytics_saves(0),
                                                  _analytics_sign_in(0),
                                                  _lastSocketID(-1),
                                                  _nam(new QNetworkAccessManager(this)),
                                                  _maxJobs(jobs),
                                                  _server(NULL),
                                                  _coordinator(NULL),
                                                  _coordinatorPingTimer(NULL)
{
    _initRenderers();

    _openCoordinator();
}

HacklilyServer::~HacklilyServer()
{
}

void HacklilyServer::_handleNewConnection()
{
    while (_server->hasPendingConnections())
    {
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

void HacklilyServer::_handleTextMessageReceived(QString message)
{
    QWebSocket *socket = qobject_cast<QWebSocket *>(sender());
    QJsonParseError parseError;
    QByteArray utfMsg = message.toUtf8();
    auto request = QJsonDocument::fromJson(utfMsg, &parseError);
    if (parseError.error != QJsonParseError::NoError)
    {
        qDebug() << "[req] Invalid message.";
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

    QString id = requestObj["id"].toString();
    QString method = requestObj["method"].toString();
    if (method != "ping")
    {
        qDebug() << "[req] id=" << id << " method=" << method;
    }

    if (_busyWorkers.contains(id))
    {
        HacklilyServerRequest req = _remoteProcessingRequests.take(id);
        QWebSocket *worker = _busyWorkers.take(id);
        _freeWorkers.push_back(worker);
        req.sender->sendTextMessage(message);
        qDebug() << "Relayed message from worker.";
        _processIfPossible();
    }
    else if (requestObj["method"] == "ping")
    {
        QJsonObject responseObj;
        responseObj["jsonrpc"] = "2.0";
        responseObj["id"] = requestObj["id"];
        responseObj["result"] = "pong";
        QJsonDocument response;
        response.setObject(responseObj);
        auto responseJSONText = response.toJson(QJsonDocument::Compact);
        socket->sendTextMessage(responseJSONText);
    }
    else if (requestObj["method"] == "notifySaved")
    {
        qDebug() << "Saved";
        ++_analytics_saves;

        QJsonObject responseObj;
        responseObj["jsonrpc"] = "2.0";
        responseObj["id"] = requestObj["id"];
        responseObj["result"] = "ok";
        QJsonDocument response;
        response.setObject(responseObj);
        auto responseJSONText = response.toJson(QJsonDocument::Compact);
        socket->sendTextMessage(responseJSONText);
    }
    else if (requestObj["method"] == "render")
    {
        ++_analytics_renders;

        QString version = requestObj["params"].toObject()["version"].toString("stable");

        HacklilyServerRequest req = {
            requestObj["params"].toObject()["src"].toString(),
            requestObj["params"].toObject()["backend"].toString(),
            version,
            socket,
            requestObj["id"].toString(),
        };
        if (!req.src.length() || !req.backend.length() || (req.backend != "svg" && req.backend != "pdf" && req.backend != "musicxml2ly"))
        {
            socket->sendTextMessage("{\"error\": \"Invalid request.\", \"errorSlug\": \"invalid_request\"}");
            return;
        }
        QDebug debug = qDebug();
        debug.noquote();
        debug << QString("[render] https://www.hacklily.org/#src=") + QString::fromLatin1(QUrl::toPercentEncoding(req.src));
        _requests.push_back(req);
        _processIfPossible();
    }
    else if (requestObj["method"] == "signIn")
    {
        QNetworkRequest request;
        request.setUrl(QUrl("https://github.com/login/oauth/access_token"));
        request.setRawHeader("Accept", QByteArray("application/json"));
        QUrlQuery queryData;
        queryData.addQueryItem("state", requestObj["params"].toObject()["state"].toString());
        queryData.addQueryItem("client_id", _ghClientID);
        queryData.addQueryItem("client_secret", _ghSecret);
        queryData.addQueryItem("code", requestObj["params"].toObject()["oauth"].toString());
        QString queryString = queryData.toString();
        QNetworkReply *reply = _nam->post(request, queryString.toUtf8());
        bool ok;
        int socketID = socket->property("socketID").toInt(&ok);
        if (!ok)
        {
            qDebug() << "No socketID found. Uh oh.";
        }
        else
        {
            reply->setProperty("socketID", socketID);
            reply->setProperty("requestID", requestObj["id"].toString());
            qDebug() << requestObj["id"] << reply->property("requestID");
        }
        connect(reply, &QNetworkReply::finished, this, &HacklilyServer::_handleOAuthReply);
    }
    else if (requestObj["method"] == "signOut")
    {
        if (requestObj["params"].toObject()["token"].toString().size() < 1)
        {
            socket->sendTextMessage("{\"error\": \"Invalid request.\", \"errorSlug\": \"invalid_request\"}");
            return;
        }
        QNetworkRequest request;
        request.setUrl(QUrl("https://api.github.com/applications/" + _ghClientID + "/tokens/" + requestObj["params"].toObject()["token"].toString()));
        request.setRawHeader("Accept", QByteArray("application/json"));
        request.setRawHeader("Authorization", "Basic " + (_ghClientID + ":" + _ghSecret).toBase64());
        QNetworkReply *reply = _nam->deleteResource(request);
        bool ok;
        int socketID = socket->property("socketID").toInt(&ok);
        if (!ok)
        {
            qDebug() << "No socketID found. Uh oh.";
        }
        else
        {
            reply->setProperty("socketID", socketID);
            reply->setProperty("requestID", requestObj["id"].toString());
            qDebug() << requestObj["id"] << reply->property("requestID");
        }
        connect(reply, &QNetworkReply::finished, this, &HacklilyServer::_handleOAuthDelete);
    }
    else if (requestObj["method"] == "i_haz_computes")
    {
        int jobs = requestObj["params"].toObject()["max_jobs"].toInt();
        if (jobs <= 1)
        {
            qDebug() << "you haz no computes...";
            return;
        }
        for (int i = 0; i < jobs; ++i)
        {
            _freeWorkers.push_back(socket);
        }
        connect(socket, &QWebSocket::disconnected, this, &HacklilyServer::_removeWorker);
        _processIfPossible();
    }
    else if (requestObj["method"] == "get_status")
    {
        QJsonObject resultObj;
        int allCount = _busyWorkers.size() + _freeWorkers.size() + _renderers.size();
        int busyLocalRendererCount = 0;
        for (int i = 0; i < _renderers.size(); ++i)
        {
            if (_renderers[i]->state() != QProcess::Running || _localProcessingRequests.contains(i))
            {
                ++busyLocalRendererCount;
            }
        }

        resultObj["alive"] = allCount > 0;
        resultObj["total_worker_count"] = allCount;
        resultObj["local_worker_count"] = _renderers.size();
        resultObj["remote_worker_count"] = _busyWorkers.size() + _freeWorkers.size();
        resultObj["busy_worker_count"] = _busyWorkers.size() + busyLocalRendererCount;
        resultObj["free_worker_count"] = _freeWorkers.size() + (_renderers.size() - busyLocalRendererCount);
        resultObj["backlog"] = _requests.size();
        resultObj["startup_time"] = _startupTime.toString(Qt::ISODate);
        resultObj["uptime_secs"] = _startupTime.secsTo(QDateTime::currentDateTimeUtc());
        resultObj["current_active_users"] = _sockets.size();
        resultObj["analytics_renders"] = _analytics_renders;
        resultObj["analytics_saves"] = _analytics_saves;
        resultObj["analytics_sign_in"] = _analytics_sign_in;

        QJsonObject responseObj;
        responseObj["jsonrpc"] = "2.0";
        responseObj["id"] = requestObj["id"];
        responseObj["result"] = resultObj;

        QJsonDocument response;
        response.setObject(responseObj);
        auto responseJSONText = response.toJson(QJsonDocument::Compact);
        socket->sendTextMessage(responseJSONText);
    }
}

void HacklilyServer::_handleBinaryMessageReceived(QByteArray)
{
    QWebSocket *socket = qobject_cast<QWebSocket *>(sender());
    qWarning() << "Got binary message. Disconnecting.";
    socket->close(QWebSocketProtocol::CloseCodeDatatypeNotSupported);
}

void HacklilyServer::_handleSocketDisconnected()
{
    QWebSocket *socket = qobject_cast<QWebSocket *>(sender());
    bool ok = true;
    int socketID = socket->property("socketID").toInt(&ok);
    if (!ok)
    {
        qDebug() << "Warning: could not get socketID of socket. Memory leak.";
        return;
    }
    _sockets.remove(socketID);
    socket->deleteLater();
}

void HacklilyServer::_initRenderers()
{
    for (int i = 0; i < _renderers.size(); ++i)
    {
        _localProcessingRequests.remove(i);
    }
    while (_renderers.size())
    {
        QProcess *renderer = _renderers.takeFirst();
        renderer->deleteLater();
    }
    for (int i = 0; i < _maxJobs; ++i)
    {
        QProcess *renderer = new QProcess(this);
        _renderers.push_back(renderer);
        connect(renderer, &QProcess::readyReadStandardOutput, this, &HacklilyServer::_handleRendererOutput);
        connect(renderer, &QProcess::started, this, &HacklilyServer::_processIfPossible);

        renderer->setProcessChannelMode(QProcess::ForwardedErrorChannel);
        if (_rendererUnstableDockerTag != "" && i >= _maxJobs / 2)
        {
            renderer->start("docker",
                            QStringList() << "run"
                                          << "--rm"
                                          << "-i"
                                          << "--net=none"
                                          << "-m1g"
                                          << "--security-opt=no-new-privileges"
                                          << "--cap-drop"
                                          << "ALL"
                                          << "--cpus=1" << _rendererUnstableDockerTag);
            _rendererVersion.append("unstable");
        }
        else
        {
            renderer->start("docker",
                            QStringList() << "run"
                                          << "--rm"
                                          << "-i"
                                          << "--net=none"
                                          << "-m1g"
                                          << "--security-opt=no-new-privileges"
                                          << "--cap-drop"
                                          << "ALL"
                                          << "--cpus=1" << _rendererDockerTag);
            _rendererVersion.append("stable");
        }
    }
}

static const char *LILYPOND_INCLUDES[] = {
    "Welcome-to-LilyPond-MacOS.ly",
    "Welcome_to_LilyPond.ly",
    "arabic.ly",
    "articulate.ly",
    "bagpipe.ly",
    "base-tkit.ly",
    "catalan.ly",
    "chord-modifiers-init.ly",
    "chord-repetition-init.ly",
    "context-mods-init.ly",
    "declarations-init.ly",
    "deutsch.ly",
    "drumpitch-init.ly",
    "dynamic-scripts-init.ly",
    "english.ly",
    "engraver-init.ly",
    "espanol.ly",
    "event-listener.ly",
    "festival.ly",
    "generate-documentation.ly",
    "generate-interface-doc-init.ly",
    "grace-init.ly",
    "graphviz-init.ly",
    "gregorian.ly",
    "guile-debugger.ly",
    "hel-arabic.ly",
    "init.ly",
    "italiano.ly",
    "lilypond-book-preamble.ly",
    "lyrics-tkit.ly",
    "makam.ly",
    "midi-init.ly",
    "music-functions-init.ly",
    "nederlands.ly",
    "norsk.ly",
    "paper-defaults-init.ly",
    "performer-init.ly",
    "piano-tkit.ly",
    "portugues.ly",
    "predefined-fretboards-init.ly",
    "predefined-guitar-fretboards.ly",
    "predefined-guitar-ninth-fretboards.ly",
    "predefined-mandolin-fretboards.ly",
    "predefined-ukulele-fretboards.ly",
    "property-init.ly",
    "satb.ly",
    "scale-definitions-init.ly",
    "scheme-sandbox.ly",
    "script-init.ly",
    "spanners-init.ly",
    "ssaattbb.ly",
    "staff-tkit.ly",
    "string-tunings-init.ly",
    "suomi.ly",
    "svenska.ly",
    "text-replacements.ly",
    "titling-init.ly",
    "toc-init.ly",
    "vlaams.ly",
    "vocal-tkit.ly",
    "voice-tkit.ly",
    NULL};

void HacklilyServer::_processIfPossible()
{
    if (_requests.length() < 1)
    {
        // Nothing to render.
        return;
    }

    // Prefer using a worker.
    if (_freeWorkers.size())
    {
        QWebSocket *worker = _freeWorkers.takeFirst();
        if (!worker->isValid())
        {
            qDebug() << "Caught invalid worker!";
            _processIfPossible();
            return;
        }
        HacklilyServerRequest request = _requests.takeFirst();
        qDebug() << "Processing on remote worker " << worker->localAddress();
        _busyWorkers[request.requestID] = worker;
        _remoteProcessingRequests[request.requestID] = request;
        QJsonObject paramsObj;
        paramsObj["backend"] = request.backend;
        paramsObj["src"] = request.src;
        paramsObj["version"] = request.version;
        QJsonObject requestObj;
        requestObj["jsonrpc"] = "2.0";
        requestObj["id"] = request.requestID;
        requestObj["params"] = paramsObj;
        requestObj["method"] = "render";
        QJsonDocument requestDoc;
        requestDoc.setObject(requestObj);
        auto json = requestDoc.toJson(QJsonDocument::Compact);
        worker->sendTextMessage(json);
        return;
    }

    bool versionIsSupported = false;
    for (int i = 0; i < _rendererVersion.length(); ++i)
    {
        if (_rendererVersion[i] == _requests[0].version)
        {
            versionIsSupported = true;
            break;
        }
    }
    if (!versionIsSupported)
    {
        HacklilyServerRequest request = _requests.takeFirst();

        QJsonObject errorObj;
        errorObj["code"] = 3;
        errorObj["message"] = "Invalid version";
        QJsonObject responseObj;
        responseObj["jsonrpc"] = "2.0";
        responseObj["id"] = request.requestID;
        responseObj["error"] = errorObj;
        QJsonDocument response;
        response.setObject(responseObj);
        auto responseJSONText = response.toJson(QJsonDocument::Compact);
        request.sender->sendTextMessage(responseJSONText);

        _processIfPossible();
        return;
    }

    // Otherwise, do it ourselves.
    for (int i = 0; i < _renderers.size(); ++i)
    {
        if (_renderers[i]->state() != QProcess::Running ||
            _localProcessingRequests.contains(i) ||
            _rendererVersion[i] != _requests[0].version)
        {
            continue;
        }
        qDebug() << "Processing on local renderer " << i;
        HacklilyServerRequest request = _requests.takeFirst();
        _localProcessingRequests[i] = request;

        QJsonObject requestObj;
        QString modifiedSrc;
        if (request.backend == "svg")
        {
            modifiedSrc += "#(ly:set-option 'backend '" + request.backend + ")\n";
        }
        else if (request.backend != "musicxml2ly")
        {
            modifiedSrc += "\n";
        }
        modifiedSrc += request.src;

        // HACK: lys doesn't handle global includes, so lets handle them ourselves by
        // outsmarting their regex.
        for (int i = 0; LILYPOND_INCLUDES[i] != NULL; ++i)
        {
            QString origStr = QString() + "\\include \"" + LILYPOND_INCLUDES[i] + "\"";
            QString newStr = QString() + "\\include  \"" + LILYPOND_INCLUDES[i] + "\"";
            modifiedSrc.replace(origStr, newStr);
        }

        requestObj["src"] = modifiedSrc;
        requestObj["backend"] = request.backend;
        QJsonDocument requestDoc;
        requestDoc.setObject(requestObj);
        auto json = requestDoc.toJson(QJsonDocument::Compact);
        json += "\n";
        _renderers[i]->write(json.data());
        return;
    }
}

void HacklilyServer::_handleOAuthReply()
{
    QNetworkReply *reply = qobject_cast<QNetworkReply *>(sender());

    QByteArray responseResult = reply->readAll();
    reply->deleteLater();

    bool ok;
    int socketID = reply->property("socketID").toInt(&ok);
    if (!ok)
    {
        qDebug() << "In oauth reply, missing socketID. Cannot continue with oauth.";
        return;
    }

    QString requestID = reply->property("requestID").toString();
    if (!_sockets.contains(socketID))
    {
        qDebug() << "Lost socket mid-oauth.";
        return;
    }
    QWebSocket *socket = _sockets.value(socketID);
    if (!socket)
    {
        return;
    }

    QJsonParseError parseError;
    auto responseResultJSON = QJsonDocument::fromJson(responseResult, &parseError);
    if (parseError.error != QJsonParseError::NoError)
    {
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
    if (responseResultObj.contains("errors") || responseResultObj.contains("error"))
    {
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
    if (!responseResultObj.contains("access_token"))
    {
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
    userInfo.accessToken = responseResultObj.value("access_token").toString().toUtf8();
    if (_userInfo.contains(userInfo.accessToken))
    {
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

    ++_analytics_sign_in;
    QNetworkRequest request;
    request.setUrl(QUrl("https://api.github.com/user"));
    request.setRawHeader("Accept", QByteArray("application/json"));
    request.setRawHeader("Authorization", "token " + userInfo.accessToken);
    QNetworkReply *userReply = _nam->get(request);
    userReply->setProperty("socketID", socketID);
    userReply->setProperty("requestID", requestID);
    connect(userReply, &QNetworkReply::finished, this, &HacklilyServer::_handleUserReply);
}

void HacklilyServer::_handleUserReply()
{
    QNetworkReply *reply = qobject_cast<QNetworkReply *>(sender());

    QByteArray responseResult = reply->readAll();
    reply->deleteLater();

    bool ok;
    int socketID = reply->property("socketID").toInt(&ok);
    if (!ok)
    {
        qDebug() << "In oauth reply, missing socketID. Cannot continue with oauth.";
        return;
    }

    QString requestID = reply->property("requestID").toString();
    if (!_sockets.contains(socketID))
    {
        qDebug() << "Lost socket mid-oauth.";
        return;
    }
    QWebSocket *socket = _sockets.value(socketID);
    if (!socket)
    {
        return;
    }

    QJsonParseError parseError;
    auto responseResultJSON = QJsonDocument::fromJson(responseResult, &parseError);
    if (parseError.error != QJsonParseError::NoError)
    {
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
    if (responseResultObj.contains("error"))
    {
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

    if (!responseResultObj.contains("email") || !responseResultObj.contains("login") || !responseResultObj.contains("name"))
    {
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
    if (!userInfo.email.size())
    {
        userInfo.email = "unknown@example.com";
    }
    if (!userInfo.name.size())
    {
        userInfo.name = userInfo.username;
    }
    _userInfo[requestID] = userInfo;

    this->_sendUserInfo(requestID, socketID);
}

void HacklilyServer::_sendUserInfo(QString requestID, int socketID)
{
    QWebSocket *socket = _sockets.value(socketID);
    if (!socket)
    {
        return;
    }

    UserInfo userInfo = _userInfo[requestID];
    QJsonObject userInfoJSON;
    userInfoJSON["accessToken"] = QString(userInfo.accessToken);
    userInfoJSON["email"] = userInfo.email;
    userInfoJSON["username"] = userInfo.username;
    userInfoJSON["name"] = userInfo.name;
    userInfoJSON["repo"] = userInfo.username + "/sheet-music";

    QJsonObject responseObj;
    responseObj["jsonrpc"] = "2.0";
    responseObj["id"] = requestID;
    responseObj["result"] = userInfoJSON;
    QJsonDocument responseJSON;
    responseJSON.setObject(responseObj);
    auto responseJSONText = responseJSON.toJson(QJsonDocument::Compact);
    socket->sendTextMessage(responseJSONText);
}

void HacklilyServer::_handleOAuthDelete()
{
    QNetworkReply *reply = qobject_cast<QNetworkReply *>(sender());

    QByteArray responseResult = reply->readAll();
    reply->deleteLater();

    bool ok;
    int socketID = reply->property("socketID").toInt(&ok);
    if (!ok)
    {
        qDebug() << "In oauth reply, missing socketID. Cannot continue with oauth.";
        return;
    }

    QString requestID = reply->property("requestID").toString();
    if (!_sockets.contains(socketID))
    {
        qDebug() << "Lost socket mid-oauth.";
        return;
    }
    QWebSocket *socket = _sockets.value(socketID);
    if (!socket)
    {
        return;
    }

    if (reply->error() != QNetworkReply::NoError)
    {
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

void HacklilyServer::_handleRendererOutput()
{
    QProcess *renderer = qobject_cast<QProcess *>(sender());
    int rendererID = _renderers.indexOf(renderer);
    if (rendererID == -1)
    {
        qDebug() << "Renderer died. Not continuing.";
        return;
    }

    if (!_localProcessingRequests.contains(rendererID))
    {
        qDebug() << "Got renderer output when not processing request.";
        // TODO: reset?
        return;
    }
    if (!renderer->bytesAvailable())
    {
        qDebug() << "Got notification that bytes are available, but none are.";
        return;
    }
    if (!renderer->canReadLine())
    {
        // Lets wait until I can read a whole line.
        return;
    }
    auto response = renderer->readLine();
    HacklilyServerRequest req = _localProcessingRequests[rendererID];
    auto sender = req.sender;
    auto requestID = req.requestID;

    QJsonParseError parseError;
    auto responseJSON = QJsonDocument::fromJson(response, &parseError);
    if (_sockets.values().contains(sender))
    {
        if (parseError.error != QJsonParseError::NoError)
        {
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
        }
        else
        {
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
    }
    else
    {
        qDebug() << "Sender died mid-flight. Ignoring";
    }
    _localProcessingRequests.remove(rendererID);
    _processIfPossible();
}

void HacklilyServer::_removeWorker()
{
    QWebSocket *socket = qobject_cast<QWebSocket *>(sender());
    _freeWorkers.removeAll(socket);
    auto it = _busyWorkers.begin();
    while (it != _busyWorkers.end())
    {
        if (it.value() == socket)
        {
            QString requestID = it.key();
            it = _busyWorkers.erase(it);
            if (_remoteProcessingRequests.contains(requestID))
            {
                HacklilyServerRequest req = _remoteProcessingRequests.take(requestID);
                if (!req.sender)
                {
                    qDebug() << "request not defined";
                    continue;
                }
                QJsonObject errorObj;
                errorObj["code"] = ERROR_INTERNAL;
                errorObj["message"] = "Worker died.";
                QJsonObject responseObj;
                responseObj["jsonrpc"] = "2.0";
                responseObj["id"] = requestID;
                responseObj["error"] = "Worker died";
                QJsonDocument response;
                response.setObject(responseObj);
                auto responseJSON = response.toJson(QJsonDocument::Compact);
                req.sender->sendTextMessage(responseJSON);
            }
        }
        else
        {
            ++it;
        }
    }
}

void HacklilyServer::_openCoordinator()
{
    qDebug() << "Connecting to coordinator...";

    _coordinator = new QWebSocket(QString(), QWebSocketProtocol::VersionLatest, this);
    _coordinator->open(QUrl(_coordinatorURL));
    connect(_coordinator, &QWebSocket::textMessageReceived, this, &HacklilyServer::_handleTextMessageReceived);
    connect(_coordinator, &QWebSocket::binaryMessageReceived, this, &HacklilyServer::_handleBinaryMessageReceived);
    connect(_coordinator, &QWebSocket::disconnected, this, &HacklilyServer::_handleCoordinatorDisconnected);
    connect(_coordinator, static_cast<void (QWebSocket::*)(QAbstractSocket::SocketError)>(&QWebSocket::error), this, &HacklilyServer::_handleCoordinatorError);
    connect(_coordinator, &QWebSocket::connected, this, &HacklilyServer::_handleCoordinatorConnected);
}

void HacklilyServer::_handleCoordinatorDisconnected()
{
    if (!_coordinator)
    {
        qWarning() << "No coordinator in _handleCoordinatorDisconnectedError";
        return;
    }
    qDebug() << "Coordinator DISCONNECTED...";

    QWebSocket *coordinator = _coordinator;
    _coordinator = NULL;
    coordinator->close();
    coordinator->deleteLater();
    for (auto it = _sockets.begin(); it != _sockets.end(); ++it)
    {
        if (it.value() == coordinator)
        {
            _sockets.erase(it);
            break;
        }
    }

    if (_coordinatorPingTimer)
    {
        _coordinatorPingTimer->deleteLater();
        _coordinatorPingTimer = NULL;
    }
    QTimer::singleShot(1000, this, &HacklilyServer::_openCoordinator);
}

void HacklilyServer::_handleCoordinatorError(QAbstractSocket::SocketError err)
{
    qWarning() << "Coordinator WebSocket error" << err;
    if (!_coordinator)
    {
        qWarning() << "No coordinator in _handleCoordinatorError";
        return;
    }

    _handleCoordinatorDisconnected();
}

void HacklilyServer::_handleCoordinatorConnected()
{
    qDebug() << "Connected!";

    int socketID = ++_lastSocketID;
    _sockets.insert(socketID, _coordinator);

    QJsonObject paramsObj;
    paramsObj["max_jobs"] = _maxJobs;

    QJsonObject requestObj;
    requestObj["jsonrpc"] = "2.0";
    requestObj["id"] = QJsonValue(QJsonValue::Null);
    requestObj["method"] = "i_haz_computes";
    requestObj["params"] = paramsObj;

    QJsonDocument request;
    request.setObject(requestObj);
    auto requestJSONText = request.toJson(QJsonDocument::Compact);
    _coordinator->sendTextMessage(requestJSONText);
    _coordinatorPingTimer = new QTimer();
    _coordinatorPingTimer->setInterval(1000);
    connect(_coordinatorPingTimer, &QTimer::timeout, this, &HacklilyServer::_doCoordinatorPing);
    _coordinatorPingTimer->start();
}

void HacklilyServer::_doCoordinatorPing()
{
    if (_coordinator && _coordinator->state() == QAbstractSocket::ConnectedState)
    {
        _coordinator->ping();
    }
}
