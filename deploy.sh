#!/usr/bin/env bash

echo "-------------------------------------------------"
echo "--------Start to deploy, running deploy.sh-------"
echo "-------------------------------------------------"

npm run build

git add *
read -t 60 -p "请输入commit信息：" commit
git commit -m "auto commit ----- $commit"
git push origin master
