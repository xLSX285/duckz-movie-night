const { Client } = require('discord.js-selfbot-v13');
const { Streamer, streamLivestreamVideo, setStreamOpts } = require('@dank074/discord-video-stream');

setStreamOpts({
    width: 2400, 
    height: 1080, 
    fps: 24, 
    bitrateKbps: 4500,
    maxBitrateKbps: 4500, 
    hardware_acceleration: true
})

async function startStreaming() {
    const streamer = new Streamer(new Client());
    await streamer.client.login('token');

    await streamer.joinVoice("guild-id", "channel-id");

    const udp = await streamer.createStream();

    udp.mediaConnection.setSpeaking(true);
    udp.mediaConnection.setVideoStatus(true);
    try {
        const res = await streamLivestreamVideo("MEDIA-TO-PLAY.mp4", udp);
        console.log("Finished playing video " + res);
    } catch (e) {
        console.log(e);
        console.log("error")
    } finally {
        udp.mediaConnection.setSpeaking(false);
        udp.mediaConnection.setVideoStatus(false);
        console.log("ending")
    }
}

startStreaming();
