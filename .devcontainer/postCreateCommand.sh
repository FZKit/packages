#!/bin/bash

echo alias p=\"pnpm\" >> ~/.oh-my-zsh/oh-my-zsh.sh
echo alias pi=\"pnpm i\" >> ~/.oh-my-zsh/oh-my-zsh.sh
echo alias pd=\"pnpm dev\" >> ~/.oh-my-zsh/oh-my-zsh.sh
echo alias pb=\"pnpm build\" >> ~/.oh-my-zsh/oh-my-zsh.sh
echo alias pu=\"pnpm update --interactive --latest\" >> ~/.oh-my-zsh/oh-my-zsh.sh
echo alias r=\"rush\" >> ~/.oh-my-zsh/oh-my-zsh.sh
echo alias ri=\"rush install\" >> ~/.oh-my-zsh/oh-my-zsh.sh
echo alias rb=\"rush build\" >> ~/.oh-my-zsh/oh-my-zsh.sh
echo alias rbwp=\"rush build:watch -t tag:pkg\" >> ~/.oh-my-zsh/oh-my-zsh.sh
git config --global --add safe.directory '*'
git config --global alias.co checkout

npm install -g @biomejs/biome
npm install -g @microsoft/rush

read -p "Deseja usar o Vim como editor do git? (Y/N): " -n 1 -r
if [[ $REPLY =~ ^[Yy]$ ]]
then
  git config --global core.editor "vi"
  export GIT_EDITOR=vi
fi