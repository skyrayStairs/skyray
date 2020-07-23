export const state = () => ({
    posts: {
      game: {},
      tech: {},
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
      res.target = "game"
      return res;
    });

    let techPosts = techFiles.keys().map(key => {
      let res = techFiles(key);
      res.slug = key.slice(2, -5);
      res.target = "tech"
      return res;
    });

    gamePosts = gamePosts.sort((a,b) => (a.date < b.date) ? 1 : ((b.date < a.date) ? -1 : 0))
    let gameByDates = {};
    for (let post of gamePosts) {
      let date = post.date.split("T")[0]
      date = date.slice(0, date.length - 3)
      if (gameByDates[date]) {
        gameByDates[date].push(post)
      } else {
        gameByDates[date] = [post]
      }
    }
    techPosts = techPosts.sort((a,b) => (a.date < b.date) ? 1 : ((b.date < a.date) ? -1 : 0))
    let techByDates = {};
    for (let post of techPosts) {
      let date = post.date.split("T")[0]
      date = date.slice(0, date.length - 3)
      if (techByDates[date]) {
        techByDates[date].push(post)
      } else {
        techByDates[date] = [post]
      }
    }
    await commit('setPosts', {target: "game", 
                              posts: gameByDates});
    await commit('setPosts', {target: "tech", 
                              posts: techByDates});
  }
};

export const getters = {
  getAllPosts: state => {
    let allPosts = []
    for (let category of Object.keys(state.posts)) {
      for(let byDate of Object.keys(state.posts[category])) {
        allPosts = [...allPosts, ...state.posts[category][byDate]]
      }
    }
    return allPosts.sort((a,b) => (a.date < b.date) ? 1 : ((b.date < a.date) ? -1 : 0)).slice(0, 10);
  },
  getPosts: (state) => (date, type, start=0, end=0) => {
    if(!state.posts[type][date]) {
      return null
    }

    if (end != 0) {
      return state.posts[type][date].slice(start, end)
    } else {
      return state.posts[type][date]
    }
  },
  // getTechPosts: (state) => (date, start=0, end=0) => {
  //   if(!state.posts.tech[date]) {
  //     return null
  //   }

  //   if (end != 0) {
  //     return state.posts.tech[date].slice(start, end)
  //   } else {
  //     return state.posts.tech[date]
  //   }
  // },
  // getGamePosts: (state) => (date, start=0, end=0) => {
  //   if(!state.posts.game[date]) {
  //     return null
  //   }

  //   if (end != 0) {
  //     return state.posts.game[date].slice(start, end)
  //   } else {
  //     return state.posts.game[date]
  //   }
  // }
}