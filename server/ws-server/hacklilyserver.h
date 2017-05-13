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

#ifndef HACKLILYSERVER_H
#define HACKLILYSERVER_H

#include <QObject>
#include <QWebSocketServer>
#include <QNetworkAccessManager>
#include <QList>
#include <QProcess>

struct HacklilyServerRequest {
    /**
     * @brief src Lilypond source
     */
    QString src;
    /**
     * @brief backend svg | pdf
     */
    QString backend;
    QWebSocket* sender;
    QString requestID;
};

struct UserInfo {
    QByteArray accessToken;
    QString name;
    QString username;
    QString email;
};

#define ERROR_JSON_PARSE 1
#define ERROR_INTERNAL 2
#define ERROR_GITHUB 3

class HacklilyServer : public QObject {
    Q_OBJECT
public:
    explicit HacklilyServer(QString rendererDockerTag, int wsPort, QByteArray ghClientID, QByteArray ghSecret, QByteArray ghAdminToken, QString ghOrg, QObject *parent = 0);
    virtual ~HacklilyServer();

signals:

private slots:
    void _handleNewConnection();
    void _handleTextMessageReceived(QString message);
    void _handleBinaryMessageReceived(QByteArray ba);
    void _handleSocketDisconnected();
    void _initRenderer();
    void _processIfPossible();
    void _handleRendererOutput();
    void _handleRepoCollaboratorsSet();
    void _sendUserInfo(QString requestID, int socketID);

    // Login flow
    void _handleOAuthReply();
    void _handleUserReply();
    void _handleRepoCreation();

    // Logout flow
    void _handleOAuthDelete();

private:
    // environment
    QString _rendererDockerTag;
    int _wsPort;
    QByteArray _ghClientID;
    QByteArray _ghSecret;
    QByteArray _ghAdminToken;
    QString _ghOrg;

    //state
    QProcess* _renderer;
    QWebSocketServer* _server;
    QMap<int, QWebSocket *> _sockets; /// by socket id
    QMap<QString, UserInfo> _userInfo; /// by request id
    int _lastSocketID;
    QList<HacklilyServerRequest> _requests;
    bool _processingRequest;
    QNetworkAccessManager *_nam;
};

#endif // HACKLILYSERVER_H
