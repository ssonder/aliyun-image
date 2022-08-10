#!/bin/sh

file_id="1Id-K7SjwCqWkLwtIGJUj5Q0Dw0E_TP_9"
save_file = "/tmp/soiling_dataset.zip"

confirm=$(wget --quiet --save-cookies /tmp/cookies.txt --keep-session-cookies --no-check-certificate 'https://docs.google.com/uc?export=download&id='$file_id -O- | sed -rn 's/.*confirm=([0-9A-Za-z_]+).*/\1\n/p')
wget --load-cookies /tmp/cookies.txt "https://docs.google.com/uc?export=download&confirm=$confirm&id=$file_id" -O $save_file && rm -rf /tmp/cookies.txt
