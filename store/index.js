export const state = () => ({
    posts: {
      game: [],
      tech: [],
    },
    curLang: "kr",
    curFlag: "kr"
  });
  
export const mutations = {
  setPosts(state, payload) {
    state.posts[payload.target] = payload.posts;
  },
  setLang(state, payload) {
    state.curLang = payload.lang;
    state.curFlag = payload.flag;
  }
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
    await commit('setPosts', {target: "game", 
                              posts: gamePosts.sort((a,b) => (a.date < b.date) ? 1 : ((b.date < a.date) ? -1 : 0))});
    await commit('setPosts', {target: "tech", 
                              posts: techPosts.sort((a,b) => (a.date < b.date) ? 1 : ((b.date < a.date) ? -1 : 0))});
  }
};

export const getters = {
  getAllPosts: state => {
    let allPosts = []
    for (let category of Object.keys(state.posts)) {
      allPosts = [...allPosts, ...state.posts[category]]
    }
    return allPosts.sort((a,b) => (a.date < b.date) ? 1 : ((b.date < a.date) ? -1 : 0)).slice(0, 10);
  }
}