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

#ifndef HACKLILYSERVER_H
#define HACKLILYSERVER_H

#include <QObject>
#include <QWebSocketServer>
#include <QNetworkAccessManager>
#include <QNetworkReply>
#include <QList>
#include <QProcess>
#include <QTimer>

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
    explicit HacklilyServer(
        QString rendererDockerTag,
        int wsPort,
        QByteArray ghClientID,
        QByteArray ghSecret,
        QByteArray ghAdminToken,
        QString ghOrg,
        QByteArray travisAdminToken,
        int jobs,
        QObject *parent = 0
    );
    explicit HacklilyServer(
        QString rendererDockerTag,
        QString coordinator,
        int jobs,
        QObject *parent = 0
    );
    virtual ~HacklilyServer();

signals:

private slots:
    // Common
    void _handleNewConnection();
    void _handleTextMessageReceived(QString message);
    void _handleBinaryMessageReceived(QByteArray ba);
    void _handleSocketDisconnected();
    void _initRenderers();
    void _initUpdateTimer();
    void _processIfPossible();
    void _handleRendererOutput();
    void _handleRepoCollaboratorsSet();
    void _sendUserInfo(QString requestID, int socketID);

    // Coordinator -- login flow
    void _handleOAuthReply();
    void _handleUserReply();
    void _handleRepoCreation();

    // Coordinator -- logout flow
    void _handleOAuthDelete();

    // Coordinator -- workers
    void _removeWorker();

    // Coordinator -- content update
    void _handleUserContentTimerFired();
    void _handleUserContentTimerTriggerError(QNetworkReply::NetworkError code);
    void _handleUserContentTimerTriggerFinished();

    // Worker
    void _openCoordinator();
    void _handleCoordinatorConnected();
    void _handleCoordinatorError(QAbstractSocket::SocketError err);
    void _handleCoordinatorDisconnected();
    void _doCoordinatorPing();

private:
    // environment
    QString _rendererDockerTag;

    // environment (coordinator)
    int _wsPort;
    QByteArray _ghClientID;
    QByteArray _ghSecret;
    QByteArray _ghAdminToken;
    QString _ghOrg;
    QByteArray _travisAdminToken;
    QList<QWebSocket*> _freeWorkers;
    QMap<QString, QWebSocket*> _busyWorkers;

    // environment (worker)
    QString _coordinatorURL;

    // state (all)
    QList<QProcess*> _renderers;
    QMap<int, QWebSocket *> _sockets; /// by socket id
    QMap<QString, UserInfo> _userInfo; /// by request id
    int _lastSocketID;
    QList<HacklilyServerRequest> _requests;
    QMap<int, HacklilyServerRequest> _localProcessingRequests;
    QMap<QString, HacklilyServerRequest> _remoteProcessingRequests;
    QNetworkAccessManager *_nam;
    int _maxJobs;
    int _totalRenderRequests;
    QDateTime _startupTime;

    // state (coordinator)
    QWebSocketServer* _server;
    bool _saveOccuredSinceLastPublish;
    QTimer *_updateUserContentTimer;

    // state (worker)
    QWebSocket *_coordinator;
    QTimer *_coordinatorPingTimer;

};

#endif // HACKLILYSERVER_H
