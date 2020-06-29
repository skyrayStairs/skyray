export const state = () => ({
    gamePosts: [],
    techPosts: [],
  });
  
  export const mutations = {
    setPosts(state, payload) {
      state[payload.target] = payload.posts;
    },
  };
  
  export const actions = {
    async nuxtServerInit({ commit }) {
      let gameFiles = await require.context('@/assets/content/game/', false, /\.json$/);
      let techFiles = await require.context('@/assets/content/tech/', false, /\.json$/);

      let gamePosts = gameFiles.keys().map(key => {
        let res = gameFiles(key);
        res.slug = key.slice(2, -5);
        return res;
      });

      let techPosts = techFiles.keys().map(key => {
        let res = techFiles(key);
        res.slug = key.slice(2, -5);
        return res;
      });
      await commit('setPosts', {target: "gamePosts", 
                                posts: gamePosts.sort((a,b) => (a.date < b.date) ? 1 : ((b.date < a.date) ? -1 : 0))});
      await commit('setPosts', {target: "techPosts", 
                                posts: techPosts.sort((a,b) => (a.date < b.date) ? 1 : ((b.date < a.date) ? -1 : 0))});
    }
  };