<template>
    <nav class="navbar">
        <div class="container">
            <div class="navbar-brand">
                <span class="navbar-item">
                    <nuxt-link to="/">
                        <fa icon="code-branch"></fa>
                    </nuxt-link>
                </span>
            </div>
            <div id="navbarMenu" class="navbar-menu">
                <div class="navbar-end">
                    <span class="navbar-item">
                        <nuxt-link to="/">Home</nuxt-link>
                    </span>
                    <span class="navbar-item">
                        <nuxt-link to="/blog">Blog</nuxt-link>
                    </span>
                </div>
            </div>
        </div>
    </nav>
</template>