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
