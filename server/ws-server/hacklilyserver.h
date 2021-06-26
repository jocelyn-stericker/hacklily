/**
 * @license
 * This file is part of Hacklily, a web-based LilyPond editor.
 * Copyright (C) 2017 - present Jocelyn Stericker <jocelyn@nettek.ca>
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
#include <QTime>

struct HacklilyServerRequest
{
    /**
     * @brief src Lilypond source
     */
    QString src;
    /**
     * @brief backend svg | pdf
     */
    QString backend;
    /**
     * @brief version stable | unstable
     */
    QString version;
    QWebSocket *sender;
    QString requestID;

    QTime received;
    QTime renderStart;
};

struct UserInfo
{
    QByteArray accessToken;
    QString name;
    QString username;
    QString email;
};

#define ERROR_JSON_PARSE 1
#define ERROR_INTERNAL 2
#define ERROR_GITHUB 3

class HacklilyServer : public QObject
{
    Q_OBJECT
  public:
    explicit HacklilyServer(
        QString rendererDockerTag,
        QString rendererUnstableDockerTag,
        int wsPort,
        QByteArray ghClientID,
        QByteArray ghSecret,
        int jobs,
        QObject *parent = 0);
    explicit HacklilyServer(
        QString rendererDockerTag,
        QString rendererUnstableDockerTag,
        QString coordinator,
        int jobs,
        QObject *parent = 0);
    virtual ~HacklilyServer();

  signals:

  private slots:
    // Common
    void _handleNewConnection();
    void _handleTextMessageReceived(QString message);
    void _handleBinaryMessageReceived(QByteArray ba);
    void _handleSocketDisconnected();
    void _initRenderers();
    void _processIfPossible();
    void _handleRendererOutput();
    void _handleRendererFinished(int exitCode, QProcess::ExitStatus);
    void _createRenderer(bool isUnstable, int rendererId);
    void _resetRenderer(int rendererId);
    void _doRender(HacklilyServerRequest req, int rendererId);
    void _checkForHangingRender();
    void _sendUserInfo(QString requestID, int socketID);

    // Coordinator -- login flow
    void _handleOAuthReply();
    void _handleUserReply();

    // Coordinator -- logout flow
    void _handleOAuthDelete();

    // Coordinator -- workers
    void _removeWorker();

    // Worker
    void _openCoordinator();
    void _handleCoordinatorConnected();
    void _handleCoordinatorError(QAbstractSocket::SocketError err);
    void _handleCoordinatorDisconnected();
    void _doCoordinatorPing();

  private:
    // environment
    QString _rendererDockerTag;
    QString _rendererUnstableDockerTag;

    // environment (coordinator)
    int _wsPort;
    QByteArray _ghClientID;
    QByteArray _ghSecret;
    QList<QWebSocket *> _freeWorkers;
    QMap<QString, QWebSocket *> _busyWorkers;

    // environment (worker)
    QString _coordinatorURL;

    // state (all)
    int _analytics_renders;
    int _analytics_saves;
    int _analytics_sign_in;
    QList<QProcess *> _renderers;
    QList<QString> _rendererVersion;   /// stable or unstable
    QMap<int, QWebSocket *> _sockets;  /// by socket id
    QMap<QString, UserInfo> _userInfo; /// by request id
    int _lastSocketID;
    QList<HacklilyServerRequest> _requests;
    QMap<int, HacklilyServerRequest> _localProcessingRequests;
    QMap<QString, HacklilyServerRequest> _remoteProcessingRequests;
    QNetworkAccessManager *_nam;
    int _maxJobs;
    QDateTime _startupTime;

    // state (coordinator)
    QWebSocketServer *_server;

    // state (worker)
    QWebSocket *_coordinator;
    QTimer *_coordinatorPingTimer;
};

#endif // HACKLILYSERVER_H
