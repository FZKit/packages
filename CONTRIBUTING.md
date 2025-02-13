# FZKit

FZKit is a collection of utilities and plugins to help you build fast and reliable Fastify applications.

## Setup

To get started with FZKit, you need to install the following global dependencies:

1. **Biome**: A code formatter and linter.
2. **Rush**: A scalable monorepo manager for JavaScript.

You can install these dependencies using the following commands:

```sh
npm install -g @biomejs/biome
npm install -g @microsoft/rush
```

## Getting Started

After installing the global dependencies, you can set up the project by running the following commands:

1. Install project dependencies:

```sh
rush install
```

3. Start coding:

You can now start coding and developing your Fastify applications using the utilities and plugins provided by FZKit.

## Commands

Here are some useful commands to help you during development:

- **Install dependencies**: `rush install`
- **Build the project**: `rush build`
- **Watch packages modifications**: `rush build:watch -t tag:pkg`
- **Check code format and linting**: `rush biome`
- **Apply format and code lint**: `rush biome:write`

## Contributing

We welcome contributions from the community! If you want to contribute, please follow these steps:

1. Fork the repository.
2. Create a new branch for your feature or bugfix.
3. Make your changes and commit them with a descriptive message.
4. Push your changes to your forked repository.
5. Create a pull request to the main repository.

Thank you for contributing to FZKit!