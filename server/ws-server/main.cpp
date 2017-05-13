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

#include <QCoreApplication>
#include <QCommandLineParser>
#include <QProcess>
#include <QDir>
#include "hacklilyserver.h"

int main(int argc, char *argv[]) {
    QCoreApplication app(argc, argv);

    /*
     * CLI Arguments
     */

    QCoreApplication::setApplicationName("hacklily-ws-server");
    QCoreApplication::setApplicationVersion("0.1");

    QCommandLineParser parser;

    parser.setApplicationDescription("Frontend of the Hacklily server");
    parser.addHelpOption();
    parser.addVersionOption();
    QCommandLineOption rendererPathOption("renderer-path",
        QCoreApplication::translate("main", "Path of a folder that has the renderer's Dockerfile"), "dir");

    QCommandLineOption tagOption("renderer-docker-tag",
        QCoreApplication::translate("main", "Arbitrary tag the renderer docker image should be set to (e.g., hacklily-renderer)"), "tag");

    QCommandLineOption clientIDOption("github-client-id",
        QCoreApplication::translate("main", "ID of GitHub application for this deployment of Hacklily"), "clid");

    QCommandLineOption secretOption("github-secret",
        QCoreApplication::translate("main", "Secret for the GitHub application for this deployment of Hacklily"), "secret");

    QCommandLineOption adminTokenOption("github-admin-token",
        QCoreApplication::translate("main", "PAT for an admin of github-org"), "admintoken");

    QCommandLineOption orgOption("github-org",
        QCoreApplication::translate("main", "Organization under which Hacklily songs live."), "org");

    QCommandLineOption portOption("ws-port",
        QCoreApplication::translate("main", "Port under which to run the WebSocket server."), "port");

    parser.addOption(rendererPathOption);
    parser.addOption(tagOption);
    parser.addOption(clientIDOption);
    parser.addOption(secretOption);
    parser.addOption(adminTokenOption);
    parser.addOption(orgOption);
    parser.addOption(portOption);
    parser.process(app);
    if (!parser.isSet("renderer-path")) {
        qDebug() << "--renderer-path must be set. See --help.\n";
        parser.showHelp(1);
    }

    QDir rendererPath(parser.value("renderer-path"));
    if (!rendererPath.exists()) {
        qDebug() << "--renderer-path must point to an existing directory. See --help.\n";
        parser.showHelp(1);
    }

    if (!parser.isSet("renderer-docker-tag")) {
        qDebug() << "--renderer-docker-tag must be set. See --help.\n";
        parser.showHelp(1);
    }

    QString rendererDockerTag = parser.value("renderer-docker-tag");

    if (!parser.isSet("ws-port")) {
        qDebug() << "--ws-port must be set. See --help.\n";
        parser.showHelp(1);
    }

    QString wsPortStr = parser.value("ws-port");
    bool ok;
    int wsPort = wsPortStr.toInt(&ok);
    if (!ok) {
        qDebug() << "--ws-port must be an integer. See --help.\n";
        parser.showHelp(1);
    }

    QString ghClientID = parser.value("github-client-id");
    QString ghSecret = parser.value("github-secret");
    QString ghAdminToken = parser.value("github-admin-token");
    QString ghOrg = parser.value("github-org");

    /*
     * Build the renderer docker image
     */
    qDebug() << "Building renderer from " << rendererPath.absolutePath();
    {
        QProcess compileRenderer;

        compileRenderer.start("docker",
            QStringList() << "build" << rendererPath.absolutePath() << "-t" << rendererDockerTag);
        compileRenderer.waitForFinished(-1);
        if (compileRenderer.exitStatus() != QProcess::NormalExit || compileRenderer.exitCode() != 0) {
            qFatal("Failed to build hacklily-renderer docker image.");
        }
    }

    HacklilyServer server(rendererDockerTag, wsPort, ghClientID.toLocal8Bit(), ghSecret.toLocal8Bit(), ghAdminToken.toLocal8Bit(), ghOrg);

    return app.exec();
}
