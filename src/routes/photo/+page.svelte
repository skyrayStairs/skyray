<svelte:head>
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" on:load={leafletLoaded}></script>
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta charset="utf-8" />
</svelte:head>
  

<!-- 지도가 들어갈 자리 -->
<div id="map_wrapper">
  <div id="map">
  </div>
</div>

<script>
  import { onMount } from 'svelte';
  
  let mounted = false;
  let leafletLoadState = false;

  onMount(() => {
      mounted = true;
      if (leafletLoadState) {
          loadLeafletElement();
      }
      
  });

  function leafletLoaded() {
      leafletLoadState = true;
      if (mounted) {
          loadLeafletElement();
      }
  }

  function loadLeafletElement() {
      // Leaflet 초기화
      var map = L.map('map').setView({lon: 127.766, lat: 36.355}, 13);

      // 최대 범위 지정
      map.setMaxBounds([[32, 123], [44, 132.5]]);

      // '오픈스트리트맵 한국'에서 서비스하는 '군사 시설 없는 오픈스트리트맵 지도 타일'을 삽입
      L.tileLayer('https://tiles.osm.kr/hot/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap 기여자</a>'
      }).addTo(map);

      // 축척 막대를 지도 왼쪽 하단에 노출 
      L.control.scale({imperial: true, metric: true}).addTo(map);

      // 마커를 지도에 추가
      L.marker({lon: 127.766, lat: 36.355}).bindPopup('대한민국의 중심지, 장연리마을').addTo(map);
  }
</script>

<style>
  #map_wrapper {
    width: 100%;
    height: 85vh;
  }

  #map {
    /* 지도의 크기를 설정 */
    width: 100vw;
    height: 100%;
  }
</style>

