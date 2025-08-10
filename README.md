# n8n-nodes-ffmpeg

This is an n8n community node. It lets you use FFmpeg in your n8n workflows to transform media files.

FFmpeg is a powerful multimedia framework that can decode, encode, transcode, mux, demux, stream, filter and play various media formats. This node provides a simple interface to use FFmpeg commands directly within n8n workflows.

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/reference/license/) workflow automation platform.

[Installation](#installation)  
[Operations](#operations)  
[Compatibility](#compatibility)  
[Usage](#usage)  
[Resources](#resources)  

## Installation

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n community nodes documentation.

## Operations

This node provides a single operation that allows you to run FFmpeg commands on media files:

- **Transform Media**: Apply FFmpeg commands to transform media files (video, audio, images)

## Compatibility

This node requires n8n version that supports n8nNodesApiVersion 1.

Node.js version >= 20.15 is required.

## Usage

### Basic Usage

1. Add the FFmpeg node to your workflow
2. Connect it to a node that provides binary data (e.g., HTTP Request, Read Binary File)
3. Configure the following parameters:
   - **Command**: The FFmpeg command to execute. Use `{input}` and `{output}` placeholders to refer to the input and output files
   - **Output File Name**: The name of the output file (including extension)
   - **Output Binary**: The name of the binary property to store the output (default: 'data')

### Example Commands

- Convert video format: `-i {input} -c:v libx264 -c:a aac {output}`
- Extract audio from video: `-i {input} -vn -acodec copy {output}`
- Resize video: `-i {input} -vf scale=640:360 {output}`
- Trim video: `-i {input} -ss 00:00:10 -to 00:00:20 -c copy {output}`
- Create a thumbnail: `-i {input} -ss 00:00:05 -vframes 1 {output}`

## Resources

* [n8n community nodes documentation](https://docs.n8n.io/integrations/community-nodes/)
* [FFmpeg documentation](https://ffmpeg.org/documentation.html)
* [FFmpeg command line examples](https://ffmpeg.org/ffmpeg.html#Examples)