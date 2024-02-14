const { Client } = require('minecum-selfbot');
const { Streamer, streamLivestreamVideo, setStreamOpts } = require('minecum-screenshare');
const { token } = require('./config.json');
const fs = require('fs');
const https = require('https');
const ytdl = require('@distube/ytdl-core');

let isScreenSharing = false;
let isDownloading = false;

// setStreamOpts({
//     width: 1920, 
//     height: 1080, 
//     fps: 24, 
//     bitrateKbps: 4500,
//     maxBitrateKbps: 6000, 
//     hardware_acceleration: true
// })

const client = new Client();
const streamer = new Streamer(client);
client.login(token).then(() => {
    console.log(`${client.user.username} is ready!`);
});

client.on("messageCreate", async message => {
    if (message.content.startsWith('$download')) {
        if (isDownloading) {
            message.reply('⚠️ Another download is already in progress. Please wait for it to finish.');
            return;
        }

        if (!fs.existsSync('./library')) {
            fs.mkdirSync('./library');
        }
    
        isDownloading = true;
    
        const args = message.content.split(' ');
        const url = args[1];
        const fileName = args[2];
    
        if (!url || !fileName) {
            message.reply('⚠️ Please provide a valid URL and file name.');
            isDownloading = false;
            return;
        }
    
        if (url.startsWith('https://www.youtube.com') || url.startsWith('https://youtu.be')) {
            const file = fs.createWriteStream(`./library/${fileName}`);
    
            ytdl.getInfo(url).then(info => {
                const videoStream = ytdl(url, { quality: 'highestaudio' });
    
                videoStream.pipe(file);
    
                message.reply(`🛫 The download of ${fileName} has been initialized.`).then(msg => {
                    const interval = setInterval(() => {
                        msg.edit(`🔃 Downloading ${fileName}`);
                    }, 5000);
    
                    videoStream.on('error', error => {
                        console.error(error);
                        msg.edit('⚠️ An error occurred while downloading the video.');
                        clearInterval(interval);
                        isDownloading = false;
                    });
    
                    videoStream.on('end', () => {
                        msg.edit(`✅ ${fileName} has been saved.`);
                        clearInterval(interval);
                        isDownloading = false;
                    });
                });
            }).catch(error => {
                console.error(error);
                message.reply('⚠️ Unable to fetch video information. Please check the provided URL.');
                isDownloading = false;
            });
        } else {
            const file = fs.createWriteStream(`./library/${fileName}`);
    
            https.get(url, response => {
                const totalSize = parseInt(response.headers['content-length'], 10);
                let downloadedSize = 0;
    
                message.reply(`🛫 The download of ${fileName} has been initialized.`).then(msg => {
                    const interval = setInterval(() => {
                        const percentage = Math.round((downloadedSize / totalSize) * 100);
                        msg.edit(`🔃 Downloading ${fileName}: ${percentage}%`);
                    }, 5000);
    
                    response.pipe(file);
    
                    response.on('error', error => {
                        console.error(error);
                        msg.edit('⚠️ An error occurred while downloading the file.');
                        clearInterval(interval);
                        isDownloading = false;
                    });
    
                    response.on('end', () => {
                        console.log('Download finished.');
    
                        const fileSize = fs.statSync(`./library/${fileName}`).size;
                        if (fileSize < 1000000) {
                            msg.edit(`⚠️ ${fileName} seems to be corrupted or incomplete. Please try again.`);
                            fs.unlinkSync(`./library/${fileName}`);
                        } else {
                            msg.edit(`✅ ${fileName} has been saved.`);
                        }
    
                        clearInterval(interval);
                        isDownloading = false;
                    });
    
                    response.on('data', chunk => {
                        downloadedSize += chunk.length;
                    });
                });
            });
        }
    } else if (message.content.startsWith('$screenshare')) {
        if (isScreenSharing) {
            message.reply('⚠️ Screen share is already in progress. Please wait until it finishes.');
            return;
        }
    
        const args = message.content.split(' ');
        const input = args.slice(1).join(' ');
    
        if (!input) {
            message.reply('⚠️ You need to provide a file name or a URL to start a screenshare.');
            return;
        }

        isScreenSharing = true;
    
        const isURL = input.startsWith('http');
    
        const media = isURL ? input : `./library/${input}`;
    
        if (!isURL && !fs.existsSync(media)) {
            message.reply(`⚠️ ${input} does not exist. Check $list or provide an URL.`);
            isScreenSharing = false;
            return;
        }
    
        message.reply('✅ Starting screenshare');
    
        await streamer.joinVoice("910717960396632114", "989649939200094289");
    
        try {
            const udp = await streamer.createStream();
    
            udp.mediaConnection.setSpeaking(true);
            udp.mediaConnection.setVideoStatus(true);
    
            try {
                const res = await streamLivestreamVideo(media, udp);
                console.log("Finished playing video " + res);
                
            } catch (e) {
                console.log(e);
                message.reply('⚠️ An error occurred during screenshare.');
            } finally {
                streamer.leaveVoice();
                streamer.stopStream();
                udp.mediaConnection.setSpeaking(false);
                udp.mediaConnection.setVideoStatus(false);
                console.log("Ending screenshare");
                isScreenSharing = false;
            }
        } catch (error) {
            console.error(error);
            message.reply('⚠️ An error occurred during screenshare.');
        }
    } else if (message.content.startsWith('$rename')) {
        const args = message.content.split(' ');
        const oldName = args[1];
        const newName = args[2];

        if (!oldName || !newName) {
            message.reply('⚠️ Please provide a valid old and new name.');
            return;
        }

        if (!fs.existsSync(`./library/${oldName}`)) {
            message.reply(`⚠️ ${oldName} does not exist. Please provide a valid name.`);
            return;
        }

        if (fs.existsSync(`./library/${newName}`)) {
            message.reply(`⚠️ ${newName} already exists. Please choose a different name or delete the existing file.`);
            return;
        }

        fs.renameSync(`./library/${oldName}`, `./library/${newName}`);

        message.reply(`✅ ${oldName} has been renamed to ${newName}.`);
    } else if (message.content.startsWith('$delete')) {
        const args = message.content.split(' ');
        const fileName = args[1];

        if (!fileName) {
            message.reply('⚠️ Please provide a valid name.');
            return;
        }

        if (!fs.existsSync(`./library/${fileName}`)) {
            message.reply(`⚠️ ${fileName} does not exist. Please provide a valid file name.`);
            return;
        }

        fs.unlinkSync(`./library/${fileName}`);

        message.reply(`✅ ${fileName} has been deleted.`);
    } else if (message.content == '$list') {

        if (!fs.existsSync('./library')) {
            fs.mkdirSync('./library');
        }
        
        const files = fs.readdirSync('./library');
        if (files.length === 0) {
            message.reply('📂 The library is empty.');
            return;
        }

        let fileList = "📂 **Files in the library:**\n";
        files.forEach(file => {
            fileList += `- ${file}\n`;
        });

        message.channel.send(fileList);
    } else if (message.content == '$help') {
        const helpMessage = `
        🤖 **Bot Commands:**
        • **$download [url] [fileName]**: Download a file from a URL and save it with the specified name.
        • **$screenshare [URL or fileName]**: Start screenshare. If a URL is provided, the bot will play the video from the URL. If a fileName is provided, the bot will attempt to play the video from the library directory.
        • **$rename [oldName] [newName]**: Rename a file in the library.
        • **$delete [fileName]**: Delete a file from the library.
        • **$list**: List all files in the library directory.
        `;
        message.channel.send(helpMessage);
    }
});